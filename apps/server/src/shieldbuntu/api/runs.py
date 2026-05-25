from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlmodel import select

from shieldbuntu.core.config import get_settings
from shieldbuntu.core.db import SessionDep
from shieldbuntu.engine.discovery import get_task_or_404
from shieldbuntu.engine.orchestrator import start_run
from shieldbuntu.models.run import HardeningEvent, HardeningRun, RunAction
from shieldbuntu.models.task import TaskCapability

router = APIRouter(prefix="/runs", tags=["runs"])


class StartRunRequest(BaseModel):
    task_id: str
    action: RunAction = RunAction.APPLY
    dry_run: bool = False
    host_id: str = "local"


@router.post("", response_model=HardeningRun, status_code=status.HTTP_201_CREATED)
async def create_run(body: StartRunRequest, session: SessionDep) -> HardeningRun:
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
async def get_run(run_id: UUID, session: SessionDep) -> HardeningRun:
    run = await session.get(HardeningRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return run


@router.get("/{run_id}/events", response_model=list[HardeningEvent])
async def list_run_events(
    run_id: UUID,
    session: SessionDep,
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
