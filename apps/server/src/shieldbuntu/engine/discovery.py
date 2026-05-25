from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import yaml
from fastapi import HTTPException

from shieldbuntu.models.task import TaskMetadata

_METADATA_FILENAME = "shieldbuntu.yml"
_LEGACY_METADATA_KEY = "shieldbuntu"


@dataclass(slots=True)
class _CacheEntry:
    mtime: float
    tasks: tuple[TaskMetadata, ...]


_cache: dict[Path, _CacheEntry] = {}
_cache_lock = Lock()


def _read_role_metadata(role_dir: Path) -> TaskMetadata | None:
    sb_file = role_dir / _METADATA_FILENAME
    if sb_file.exists():
        raw = yaml.safe_load(sb_file.read_text()) or {}
        if not raw:
            return None
        raw.setdefault("id", role_dir.name)
        return TaskMetadata.model_validate(raw)

    legacy_meta = role_dir / "meta" / "main.yml"
    if legacy_meta.exists():
        legacy = yaml.safe_load(legacy_meta.read_text()) or {}
        sb_meta = legacy.get(_LEGACY_METADATA_KEY)
        if sb_meta:
            sb_meta.setdefault("id", role_dir.name)
            return TaskMetadata.model_validate(sb_meta)
    return None


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


def _latest_mtime(roles_root: Path) -> float:
    return max(
        (p.stat().st_mtime for p in roles_root.rglob(_METADATA_FILENAME)),
        default=0.0,
    )


def discover_tasks_cached(roles_root: Path) -> list[TaskMetadata]:
    if not roles_root.exists():
        return []
    key = roles_root.resolve()
    mtime = _latest_mtime(roles_root)
    with _cache_lock:
        entry = _cache.get(key)
        if entry is not None and entry.mtime == mtime:
            return list(entry.tasks)
        tasks = tuple(discover_tasks(roles_root))
        _cache[key] = _CacheEntry(mtime=mtime, tasks=tasks)
        return list(tasks)


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
