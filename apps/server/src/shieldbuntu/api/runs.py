from __future__ import annotations

import asyncio
import contextlib
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlmodel import select
from sse_starlette.sse import EventSourceResponse

from shieldbuntu.api.deps import CurrentSession
from shieldbuntu.core.config import get_settings
from shieldbuntu.core.db import SessionDep, session_scope
from shieldbuntu.engine.discovery import get_task_or_404
from shieldbuntu.engine.orchestrator import (
    TERMINAL_STATUSES,
    get_active_run,
    request_cancel,
    start_run,
)
from shieldbuntu.models.run import HardeningEvent, HardeningRun, RunAction, RunStatus
from shieldbuntu.models.task import TaskCapability

router = APIRouter(prefix="/runs", tags=["runs"])

SSE_KEEPALIVE_SECONDS = 15


class StartRunRequest(BaseModel):
    task_id: str
    action: RunAction = RunAction.APPLY
    dry_run: bool = False
    host_id: str = "local"


class CancelResponse(BaseModel):
    run_id: UUID
    cancel_requested: bool


@router.post("", response_model=HardeningRun, status_code=status.HTTP_201_CREATED)
async def create_run(
    body: StartRunRequest, session: SessionDep, _user: CurrentSession
) -> HardeningRun:
    task = get_task_or_404(get_settings().ansible_root / "roles", body.task_id)
    required = TaskCapability(body.action.value)
    if required not in task.capabilities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task '{task.id}' does not support action '{body.action}'",
        )
    run_id = await start_run(body.task_id, body.action, body.dry_run, body.host_id)
    run = await session.get(HardeningRun, run_id)
    if run is None:
        raise HTTPException(status_code=500, detail="Run vanished after creation")
    return run


@router.get("", response_model=list[HardeningRun])
async def list_runs(
    session: SessionDep,
    _user: CurrentSession,
    task_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[HardeningRun]:
    stmt = select(HardeningRun).order_by(HardeningRun.started_at.desc())
    if task_id:
        stmt = stmt.where(HardeningRun.task_id == task_id)
    stmt = stmt.limit(limit).offset(offset)
    result = await session.exec(stmt)
    return list(result.all())


@router.get("/{run_id}", response_model=HardeningRun)
async def get_run(run_id: UUID, session: SessionDep, _user: CurrentSession) -> HardeningRun:
    run = await session.get(HardeningRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return run


@router.get("/{run_id}/events", response_model=list[HardeningEvent])
async def list_run_events(
    run_id: UUID,
    session: SessionDep,
    _user: CurrentSession,
    since_seq: int = Query(default=0, ge=0),
    limit: int = Query(default=500, ge=1, le=5000),
) -> list[HardeningEvent]:
    run = await session.get(HardeningRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    stmt = (
        select(HardeningEvent)
        .where(HardeningEvent.run_id == run_id)
        .where(HardeningEvent.seq > since_seq)
        .order_by(HardeningEvent.seq)
        .limit(limit)
    )
    result = await session.exec(stmt)
    return list(result.all())


@router.post(
    "/{run_id}/cancel",
    response_model=CancelResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def cancel_run(run_id: UUID, session: SessionDep, _user: CurrentSession) -> CancelResponse:
    run = await session.get(HardeningRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    if run.status in TERMINAL_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Run already finished (status={run.status})",
        )
    requested = request_cancel(run_id)
    return CancelResponse(run_id=run_id, cancel_requested=requested)


def _event_to_payload(event: HardeningEvent) -> dict[str, Any]:
    ts = event.ts
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=UTC)
    return {
        "seq": event.seq,
        "level": event.level.value,
        "message": event.message,
        "ts": ts.isoformat(),
    }


def _parsed_to_payload(parsed: dict[str, Any]) -> dict[str, Any]:
    return {
        "seq": parsed["seq"],
        "level": parsed["level"].value
        if hasattr(parsed["level"], "value")
        else str(parsed["level"]),
        "message": parsed["message"],
        "ts": datetime.now(UTC).isoformat(),
    }


@router.get("/{run_id}/stream")
async def stream_run_events(
    run_id: UUID,
    request: Request,
    _user: CurrentSession,
    since_seq: int = Query(default=0, ge=0),
) -> EventSourceResponse:
    async with session_scope() as session:
        run = await session.get(HardeningRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")

    async def event_generator() -> AsyncIterator[dict[str, Any]]:
        last_seq = since_seq

        async with session_scope() as session:
            stmt = (
                select(HardeningEvent)
                .where(HardeningEvent.run_id == run_id)
                .where(HardeningEvent.seq > last_seq)
                .order_by(HardeningEvent.seq)
            )
            persisted = (await session.exec(stmt)).all()

        for event in persisted:
            if await request.is_disconnected():
                return
            yield {
                "event": "event",
                "data": json.dumps(_event_to_payload(event)),
            }
            last_seq = event.seq

        active = get_active_run(run_id)
        if active is None:
            async with session_scope() as session:
                final = await session.get(HardeningRun, run_id)
            yield {
                "event": "terminal",
                "data": json.dumps(
                    {
                        "run_id": str(run_id),
                        "status": (final.status if final else RunStatus.FAILED).value,
                        "exit_code": final.exit_code if final else None,
                    }
                ),
            }
            return

        subscriber: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
        active.subscribers.append(subscriber)
        try:
            while True:
                if await request.is_disconnected():
                    return
                try:
                    item = await asyncio.wait_for(subscriber.get(), timeout=1.0)
                except TimeoutError:
                    continue
                if item is None:
                    break
                if item["seq"] <= last_seq:
                    continue
                yield {
                    "event": "event",
                    "data": json.dumps(_parsed_to_payload(item)),
                }
                last_seq = item["seq"]
        finally:
            with contextlib.suppress(ValueError):
                active.subscribers.remove(subscriber)

        async with session_scope() as session:
            final = await session.get(HardeningRun, run_id)
        yield {
            "event": "terminal",
            "data": json.dumps(
                {
                    "run_id": str(run_id),
                    "status": (final.status if final else RunStatus.FAILED).value,
                    "exit_code": final.exit_code if final else None,
                }
            ),
        }

    return EventSourceResponse(event_generator(), ping=SSE_KEEPALIVE_SECONDS)
