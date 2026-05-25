from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml
from fastapi import HTTPException

from shieldbuntu.models.task import TaskMetadata


def _read_role_metadata(role_dir: Path) -> TaskMetadata | None:
    meta_file = role_dir / "meta" / "main.yml"
    if not meta_file.exists():
        return None
    raw = yaml.safe_load(meta_file.read_text()) or {}
    sb_meta = raw.get("shieldbuntu")
    if not sb_meta:
        return None
    sb_meta.setdefault("id", role_dir.name)
    return TaskMetadata.model_validate(sb_meta)


def discover_tasks(roles_root: Path) -> list[TaskMetadata]:
    if not roles_root.exists():
        return []
    tasks: list[TaskMetadata] = []
    for role_dir in sorted(roles_root.iterdir()):
        if not role_dir.is_dir():
            continue
        meta = _read_role_metadata(role_dir)
        if meta is not None:
            tasks.append(meta)
    return tasks


@lru_cache(maxsize=8)
def _cached_discover(roles_root_str: str, mtime: float) -> tuple[TaskMetadata, ...]:
    return tuple(discover_tasks(Path(roles_root_str)))


def discover_tasks_cached(roles_root: Path) -> list[TaskMetadata]:
    if not roles_root.exists():
        return []
    mtime = max(
        (p.stat().st_mtime for p in roles_root.rglob("meta/main.yml")),
        default=0.0,
    )
    return list(_cached_discover(str(roles_root), mtime))


def find_task(roles_root: Path, task_id: str) -> TaskMetadata | None:
    for task in discover_tasks_cached(roles_root):
        if task.id == task_id:
            return task
    return None


def get_task_or_404(roles_root: Path, task_id: str) -> TaskMetadata:
    task = find_task(roles_root, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    return task
