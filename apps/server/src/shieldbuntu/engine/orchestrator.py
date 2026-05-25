from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol
from uuid import UUID

from shieldbuntu.core.config import get_settings
from shieldbuntu.core.db import session_scope
from shieldbuntu.core.logging import get_logger
from shieldbuntu.engine.events import parse_event, summarise_stats
from shieldbuntu.engine.runner import run_playbook
from shieldbuntu.models.run import (
    EventLevel,
    HardeningEvent,
    HardeningRun,
    RunAction,
    RunStatus,
)

log = get_logger(__name__)


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
    ) -> dict[str, Any]: ...


@dataclass
class _OrchestratorState:
    runner_impl: RunnerCallable
    background_tasks: set[asyncio.Task[Any]] = field(default_factory=set)
    completion_hooks: list[Callable[[UUID], Awaitable[None]]] = field(default_factory=list)


_state = _OrchestratorState(runner_impl=run_playbook)


def set_runner(runner: RunnerCallable) -> None:
    _state.runner_impl = runner


def reset_runner() -> None:
    _state.runner_impl = run_playbook


def on_run_complete(hook: Callable[[UUID], Awaitable[None]]) -> None:
    _state.completion_hooks.append(hook)


async def start_run(
    task_id: str,
    action: RunAction,
    dry_run: bool = False,
    host_id: str = "local",
) -> UUID:
    async with session_scope() as session:
        run = HardeningRun(task_id=task_id, action=action, dry_run=dry_run, host_id=host_id)
        session.add(run)
        await session.commit()
        await session.refresh(run)
        run_id = run.id

    task = asyncio.create_task(_execute_run(run_id, task_id, action, dry_run))
    _state.background_tasks.add(task)
    task.add_done_callback(_state.background_tasks.discard)
    return run_id


async def _execute_run(run_id: UUID, task_id: str, action: RunAction, dry_run: bool) -> None:
    settings = get_settings()
    private_data_dir = settings.data_dir / "runs" / str(run_id)

    async with session_scope() as session:
        run = await session.get(HardeningRun, run_id)
        if run is None:
            return
        run.status = RunStatus.RUNNING
        await session.commit()

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
    seq = 0

    def on_event(event_data: dict[str, Any]) -> None:
        nonlocal seq
        seq += 1
        parsed = parse_event(event_data, seq=seq)
        loop.call_soon_threadsafe(queue.put_nowait, parsed)

    persister = asyncio.create_task(_persist_events(run_id, queue))

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
        )
    except Exception as exc:
        failure = exc
        log.exception("run.execution_failed", run_id=str(run_id), task_id=task_id)
    finally:
        await queue.put(None)
        await persister

    rc = int(result.get("rc", 1)) if result else 1
    status_str = result.get("status", "")
    if failure is not None or rc != 0 or status_str == "failed":
        status = RunStatus.FAILED
    else:
        status = RunStatus.SUCCEEDED

    async with session_scope() as session:
        run = await session.get(HardeningRun, run_id)
        if run is None:
            return
        run.status = status
        run.finished_at = datetime.now(UTC)
        run.exit_code = rc if not failure else -1
        run.summary = summarise_stats(result.get("stats") or {})
        if failure is not None:
            run.summary = {**(run.summary or {}), "error": str(failure)}
        await session.commit()

    for hook in _state.completion_hooks:
        await hook(run_id)


async def _persist_events(run_id: UUID, queue: asyncio.Queue[dict[str, Any] | None]) -> None:
    batch: list[dict[str, Any]] = []
    while True:
        item = await queue.get()
        if item is None:
            if batch:
                await _flush_events(run_id, batch)
            return
        batch.append(item)
        if len(batch) >= 16:
            await _flush_events(run_id, batch)
            batch = []


async def _flush_events(run_id: UUID, batch: list[dict[str, Any]]) -> None:
    async with session_scope() as session:
        for parsed in batch:
            session.add(
                HardeningEvent(
                    run_id=run_id,
                    seq=parsed["seq"],
                    level=EventLevel(parsed["level"]),
                    message=parsed["message"],
                    payload=parsed["payload"],
                )
            )
        await session.commit()


async def wait_for_background_runs() -> None:
    if _state.background_tasks:
        await asyncio.gather(*_state.background_tasks, return_exceptions=True)
