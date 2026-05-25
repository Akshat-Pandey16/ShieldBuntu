from __future__ import annotations

import asyncio
import contextlib
import json
import re
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
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
from shieldbuntu.models.run import EventLevel, HardeningEvent, HardeningRun, RunAction, RunStatus
from shieldbuntu.models.task import TaskMetadata

router = APIRouter(prefix="/runs", tags=["runs"])

SSE_KEEPALIVE_SECONDS = 15
SSE_DISCONNECT_POLL = 1.0


class StartRunRequest(BaseModel):
    task_id: str = Field(min_length=1, max_length=128)
    action: RunAction = RunAction.APPLY
    dry_run: bool = False
    host_id: str = Field(default="local", min_length=1, max_length=64)
    inputs: dict[str, str] = Field(default_factory=dict)


class CancelResponse(BaseModel):
    run_id: UUID
    cancel_requested: bool


class EventSummary(BaseModel):
    seq: int
    ts: datetime
    level: EventLevel
    message: str


def _to_summary(event: HardeningEvent) -> EventSummary:
    return EventSummary(seq=event.seq, ts=event.ts, level=event.level, message=event.message)


def _validate_inputs(task: TaskMetadata, inputs: dict[str, str]) -> dict[str, Any]:
    declared = {spec.name: spec for spec in task.inputs}
    cleaned: dict[str, Any] = {}
    for name, value in inputs.items():
        if name not in declared:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown input '{name}' for task '{task.id}'",
            )
        spec = declared[name]
        if spec.pattern and not re.fullmatch(spec.pattern, value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Input '{name}' does not match required pattern",
            )
        cleaned[name] = value
    for name, spec in declared.items():
        if spec.required and name not in cleaned:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Required input '{name}' missing",
            )
    return cleaned


@router.post("", response_model=HardeningRun, status_code=status.HTTP_201_CREATED)
async def create_run(
    body: StartRunRequest, session: SessionDep, user: CurrentSession
) -> HardeningRun:
    task = get_task_or_404(get_settings().ansible_root / "roles", body.task_id)
    if body.action not in task.capabilities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task '{task.id}' does not support action '{body.action}'",
        )
    extra_vars = _validate_inputs(task, body.inputs) if task.inputs else {}
    run_id = await start_run(
        body.task_id,
        body.action,
        body.dry_run,
        body.host_id,
        initiated_by=user.username,
        extra_vars=extra_vars or None,
    )
    run = await session.get(HardeningRun, run_id)
    if run is None:
        raise HTTPException(status_code=500, detail="Run vanished after creation")
    return run


@router.get("", response_model=list[HardeningRun])
async def list_runs(
    session: SessionDep,
    _user: CurrentSession,
    task_id: Annotated[str | None, Query()] = None,
    status_filter: Annotated[RunStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[HardeningRun]:
    stmt = select(HardeningRun).order_by(HardeningRun.started_at.desc())
    if task_id:
        stmt = stmt.where(HardeningRun.task_id == task_id)
    if status_filter:
        stmt = stmt.where(HardeningRun.status == status_filter)
    stmt = stmt.limit(limit).offset(offset)
    result = await session.exec(stmt)
    return list(result.all())


@router.get("/{run_id}", response_model=HardeningRun)
async def get_run(run_id: UUID, session: SessionDep, _user: CurrentSession) -> HardeningRun:
    run = await session.get(HardeningRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return run


@router.get("/{run_id}/events", response_model=list[EventSummary])
async def list_run_events(
    run_id: UUID,
    session: SessionDep,
    _user: CurrentSession,
    since_seq: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=5000)] = 500,
) -> list[EventSummary]:
    run = await session.get(HardeningRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    stmt = (
        select(
            HardeningEvent.seq,
            HardeningEvent.ts,
            HardeningEvent.level,
            HardeningEvent.message,
        )
        .where(HardeningEvent.run_id == run_id)
        .where(HardeningEvent.seq > since_seq)
        .order_by(HardeningEvent.seq)
        .limit(limit)
    )
    result = await session.exec(stmt)
    return [
        EventSummary(seq=row.seq, ts=row.ts, level=row.level, message=row.message)
        for row in result.all()
    ]


@router.get("/{run_id}/events/{seq}", response_model=HardeningEvent)
async def get_run_event(
    run_id: UUID,
    seq: int,
    session: SessionDep,
    _user: CurrentSession,
) -> HardeningEvent:
    stmt = (
        select(HardeningEvent)
        .where(HardeningEvent.run_id == run_id)
        .where(HardeningEvent.seq == seq)
        .limit(1)
    )
    result = await session.exec(stmt)
    event = result.first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


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
        return CancelResponse(run_id=run_id, cancel_requested=run.cancel_requested)
    requested = request_cancel(run_id)
    if requested:
        run.cancel_requested = True
        await session.commit()
    return CancelResponse(run_id=run_id, cancel_requested=requested)


def _event_payload(event: HardeningEvent) -> dict[str, Any]:
    ts = event.ts if event.ts.tzinfo is not None else event.ts.replace(tzinfo=UTC)
    return {
        "seq": event.seq,
        "level": event.level.value,
        "message": event.message,
        "ts": ts.isoformat(),
    }


@router.get("/{run_id}/stream")
async def stream_run_events(
    run_id: UUID,
    request: Request,
    _user: CurrentSession,
    since_seq: Annotated[int, Query(ge=0)] = 0,
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
            yield {"event": "event", "data": json.dumps(_event_payload(event))}
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

        subscriber: asyncio.Queue[HardeningEvent | None] = asyncio.Queue()
        active.subscribers.append(subscriber)
        try:
            while True:
                if await request.is_disconnected():
                    return
                try:
                    item = await asyncio.wait_for(subscriber.get(), timeout=SSE_DISCONNECT_POLL)
                except TimeoutError:
                    continue
                if item is None:
                    break
                if item.seq <= last_seq:
                    continue
                yield {"event": "event", "data": json.dumps(_event_payload(item))}
                last_seq = item.seq
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
