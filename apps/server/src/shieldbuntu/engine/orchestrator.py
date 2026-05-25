from __future__ import annotations

import asyncio
import contextlib
import threading
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol
from uuid import UUID

from fastapi import HTTPException
from fastapi import status as http_status
from sqlmodel import select

from shieldbuntu.core.config import get_settings
from shieldbuntu.core.db import session_scope
from shieldbuntu.core.logging import get_logger
from shieldbuntu.core.startup import reclaim_path_ownership
from shieldbuntu.engine.events import build_event, summarise_stats
from shieldbuntu.engine.runner import run_playbook
from shieldbuntu.models.run import (
    HardeningEvent,
    HardeningRun,
    RunAction,
    RunStatus,
)

log = get_logger(__name__)

ACTIVE_RUN_TTL_SECONDS = 5.0
TERMINAL_STATUSES: frozenset[RunStatus] = frozenset(
    {RunStatus.SUCCEEDED, RunStatus.NO_CHANGE, RunStatus.FAILED, RunStatus.CANCELLED}
)


class RunnerCallable(Protocol):
    def __call__(
        self,
        *,
        ansible_root: Path,
        action: str,
        task_role: str,
        dry_run: bool,
        private_data_dir: Path,
        on_event: Callable[[dict[str, Any]], None],
        cancel_callback: Callable[[], bool] | None = None,
        extra_vars: dict[str, Any] | None = None,
    ) -> dict[str, Any]: ...


@dataclass
class ActiveRun:
    run_id: UUID
    cancel_event: threading.Event = field(default_factory=threading.Event)
    subscribers: list[asyncio.Queue[HardeningEvent | None]] = field(default_factory=list)
    terminated: asyncio.Event = field(default_factory=asyncio.Event)


@dataclass
class _OrchestratorState:
    runner_impl: RunnerCallable
    background_tasks: set[asyncio.Task[Any]] = field(default_factory=set)
    active_runs: dict[UUID, ActiveRun] = field(default_factory=dict)
    completion_hooks: list[Callable[[UUID], Awaitable[None]]] = field(default_factory=list)
    target_locks: dict[tuple[str, str], asyncio.Lock] = field(default_factory=dict)
    state_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


_state = _OrchestratorState(runner_impl=run_playbook)


def set_runner(runner: RunnerCallable) -> None:
    _state.runner_impl = runner


def reset_runner() -> None:
    _state.runner_impl = run_playbook


def on_run_complete(hook: Callable[[UUID], Awaitable[None]]) -> None:
    _state.completion_hooks.append(hook)


def get_active_run(run_id: UUID) -> ActiveRun | None:
    return _state.active_runs.get(run_id)


def request_cancel(run_id: UUID) -> bool:
    active = _state.active_runs.get(run_id)
    if active is None:
        return False
    active.cancel_event.set()
    return True


async def _lock_for(task_id: str, host_id: str) -> asyncio.Lock:
    key = (task_id, host_id)
    async with _state.state_lock:
        lock = _state.target_locks.get(key)
        if lock is None:
            lock = asyncio.Lock()
            _state.target_locks[key] = lock
        return lock


async def _has_running_for(task_id: str, host_id: str) -> bool:
    async with session_scope() as db:
        stmt = (
            select(HardeningRun)
            .where(HardeningRun.task_id == task_id)
            .where(HardeningRun.host_id == host_id)
            .where(HardeningRun.status.in_([RunStatus.PENDING, RunStatus.RUNNING]))  # type: ignore[attr-defined]
            .limit(1)
        )
        result = await db.exec(stmt)
        return result.first() is not None


async def start_run(
    task_id: str,
    action: RunAction,
    dry_run: bool = False,
    host_id: str = "local",
    *,
    initiated_by: str | None = None,
    extra_vars: dict[str, Any] | None = None,
) -> UUID:
    if await _has_running_for(task_id, host_id):
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Another run for '{task_id}' on '{host_id}' is already in progress",
        )

    async with session_scope() as session:
        run = HardeningRun(
            task_id=task_id,
            action=action,
            dry_run=dry_run,
            host_id=host_id,
            initiated_by=initiated_by,
        )
        session.add(run)
        await session.commit()
        await session.refresh(run)
        run_id = run.id

    _state.active_runs[run_id] = ActiveRun(run_id=run_id)

    task = asyncio.create_task(_execute_run(run_id, task_id, action, dry_run, host_id, extra_vars))
    _state.background_tasks.add(task)
    task.add_done_callback(_state.background_tasks.discard)
    return run_id


async def _mark_running(run_id: UUID) -> None:
    async with session_scope() as session:
        run = await session.get(HardeningRun, run_id)
        if run is None:
            return
        run.status = RunStatus.RUNNING
        await session.commit()


def _make_on_event(
    run_id: UUID,
    active: ActiveRun,
    persistence_queue: asyncio.Queue[HardeningEvent | None],
    seq_box: list[int],
    loop: asyncio.AbstractEventLoop,
    max_payload_bytes: int,
) -> Callable[[dict[str, Any]], None]:
    def on_event(raw: dict[str, Any]) -> None:
        seq_box[0] += 1
        event = build_event(run_id, raw, seq=seq_box[0], max_payload_bytes=max_payload_bytes)

        def deliver() -> None:
            persistence_queue.put_nowait(event)
            for sub in list(active.subscribers):
                sub.put_nowait(event)

        loop.call_soon_threadsafe(deliver)

    return on_event


async def _run_to_completion(
    run_id: UUID,
    task_id: str,
    action: RunAction,
    dry_run: bool,
    host_id: str,
    extra_vars: dict[str, Any] | None,
    active: ActiveRun,
    private_data_dir: Path,
) -> tuple[dict[str, Any], Exception | None]:
    settings = get_settings()
    loop = asyncio.get_running_loop()
    persistence_queue: asyncio.Queue[HardeningEvent | None] = asyncio.Queue()
    seq_box = [0]

    on_event = _make_on_event(
        run_id,
        active,
        persistence_queue,
        seq_box,
        loop,
        settings.event_payload_max_bytes,
    )

    persister = asyncio.create_task(
        _persist_events(
            persistence_queue,
            settings.event_flush_batch_size,
            settings.event_flush_interval_ms / 1000.0,
        )
    )

    result: dict[str, Any] = {}
    failure: Exception | None = None
    try:
        result = await asyncio.to_thread(
            _state.runner_impl,
            ansible_root=settings.ansible_root,
            action=action.value,
            task_role=task_id,
            dry_run=dry_run,
            private_data_dir=private_data_dir,
            on_event=on_event,
            cancel_callback=active.cancel_event.is_set,
            extra_vars=extra_vars,
        )
    except Exception as exc:
        failure = exc
        log.exception("run.execution_failed", run_id=str(run_id), task_id=task_id, host_id=host_id)
    finally:
        await persistence_queue.put(None)
        with contextlib.suppress(Exception):
            await persister

    return result, failure


def _final_status(
    *,
    result: dict[str, Any],
    failure: Exception | None,
    cancel_event: threading.Event,
) -> tuple[RunStatus, int]:
    rc = int(result.get("rc", 1)) if result else 1
    status_str = result.get("status", "")

    if cancel_event.is_set():
        return RunStatus.CANCELLED, rc
    if failure is not None:
        return RunStatus.FAILED, -1
    if rc != 0 or status_str == "failed":
        return RunStatus.FAILED, rc

    summary = summarise_stats(result.get("stats") or {})
    if summary.get("changed", 0) == 0 and summary.get("failures", 0) == 0:
        return RunStatus.NO_CHANGE, rc
    return RunStatus.SUCCEEDED, rc


async def _finalize_run(
    run_id: UUID,
    result: dict[str, Any],
    failure: Exception | None,
    cancel_event: threading.Event,
) -> None:
    status, exit_code = _final_status(result=result, failure=failure, cancel_event=cancel_event)
    summary = summarise_stats(result.get("stats") or {})
    if failure is not None:
        summary = {**(summary or {}), "error": str(failure)}

    async with session_scope() as session:
        run = await session.get(HardeningRun, run_id)
        if run is None:
            return
        run.status = status
        run.finished_at = datetime.now(UTC)
        run.exit_code = exit_code
        run.summary = summary
        if cancel_event.is_set():
            run.cancel_requested = True
        await session.commit()


async def _execute_run(
    run_id: UUID,
    task_id: str,
    action: RunAction,
    dry_run: bool,
    host_id: str,
    extra_vars: dict[str, Any] | None,
) -> None:
    settings = get_settings()
    active = _state.active_runs[run_id]
    private_data_dir = settings.data_dir / "runs" / str(run_id)

    lock = await _lock_for(task_id, host_id)
    async with lock:
        await _mark_running(run_id)
        result, failure = await _run_to_completion(
            run_id,
            task_id,
            action,
            dry_run,
            host_id,
            extra_vars,
            active,
            private_data_dir,
        )
        await _finalize_run(run_id, result, failure, active.cancel_event)
        _reclaim_run_dir(private_data_dir, run_id)

    _signal_run_terminated(active, run_id)

    for hook in _state.completion_hooks:
        try:
            await hook(run_id)
        except Exception:
            log.exception("run.completion_hook_failed", run_id=str(run_id))


def _reclaim_run_dir(private_data_dir: Path, run_id: UUID) -> None:
    try:
        chowned = reclaim_path_ownership(private_data_dir)
        if chowned:
            log.info("run.dir_chown", run_id=str(run_id), count=chowned)
    except Exception:
        log.exception("run.dir_chown_failed", run_id=str(run_id))


def _signal_run_terminated(active: ActiveRun, run_id: UUID) -> None:
    active.terminated.set()
    for sub in list(active.subscribers):
        sub.put_nowait(None)
    eviction = asyncio.create_task(_evict_active_run(run_id, ACTIVE_RUN_TTL_SECONDS))
    _state.background_tasks.add(eviction)
    eviction.add_done_callback(_state.background_tasks.discard)


async def _evict_active_run(run_id: UUID, delay: float) -> None:
    await asyncio.sleep(delay)
    _state.active_runs.pop(run_id, None)


async def _persist_events(
    queue: asyncio.Queue[HardeningEvent | None],
    batch_size: int,
    flush_interval: float,
) -> None:
    batch: list[HardeningEvent] = []
    while True:
        timeout = flush_interval if batch else None
        try:
            item = await asyncio.wait_for(queue.get(), timeout=timeout)
        except TimeoutError:
            if batch:
                await _flush_events(batch)
                batch = []
            continue
        if item is None:
            if batch:
                await _flush_events(batch)
            return
        batch.append(item)
        if len(batch) >= batch_size:
            await _flush_events(batch)
            batch = []


async def _flush_events(batch: list[HardeningEvent]) -> None:
    try:
        async with session_scope() as session:
            session.add_all(batch)
            await session.commit()
    except Exception:
        log.exception("run.event_flush_failed", count=len(batch))


async def wait_for_background_runs(timeout: float | None = None) -> None:  # noqa: ASYNC109
    if not _state.background_tasks:
        return
    tasks = list(_state.background_tasks)
    if timeout is None:
        await asyncio.gather(*tasks, return_exceptions=True)
        return
    _, pending = await asyncio.wait(tasks, timeout=timeout)
    for task in pending:
        task.cancel()
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)
