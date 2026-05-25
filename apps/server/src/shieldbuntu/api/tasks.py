from __future__ import annotations

from fastapi import APIRouter

from shieldbuntu.core.config import get_settings
from shieldbuntu.engine.discovery import discover_tasks_cached, get_task_or_404
from shieldbuntu.models.task import TaskMetadata

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskMetadata])
async def list_tasks() -> list[TaskMetadata]:
    return discover_tasks_cached(get_settings().ansible_root / "roles")


@router.get("/{task_id}", response_model=TaskMetadata)
async def get_task(task_id: str) -> TaskMetadata:
    return get_task_or_404(get_settings().ansible_root / "roles", task_id)
