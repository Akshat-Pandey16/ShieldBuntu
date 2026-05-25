from __future__ import annotations

import shutil
from collections.abc import Callable
from pathlib import Path
from typing import Any, Protocol

import ansible_runner


class RunnerResult(Protocol):
    rc: int
    status: str
    stats: dict[str, Any] | None


def run_playbook(
    *,
    ansible_root: Path,
    action: str,
    task_role: str,
    dry_run: bool,
    private_data_dir: Path,
    on_event: Callable[[dict[str, Any]], None],
    cancel_callback: Callable[[], bool] | None = None,
    extra_vars: dict[str, Any] | None = None,
) -> dict[str, Any]:
    private_data_dir.mkdir(parents=True, exist_ok=True)

    playbook_path = ansible_root / "playbooks" / f"{action}.yml"
    inventory_path = ansible_root / "inventory" / "localhost.yml"

    extravars: dict[str, Any] = {"task_role": task_role}
    if extra_vars:
        extravars.update(extra_vars)

    kwargs: dict[str, Any] = {
        "playbook": str(playbook_path),
        "inventory": str(inventory_path),
        "extravars": extravars,
        "envvars": {
            "ANSIBLE_ROLES_PATH": str(ansible_root / "roles"),
            "ANSIBLE_LOCALHOST_WARNING": "False",
            "ANSIBLE_INVENTORY_UNPARSED_WARNING": "False",
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
        },
        "quiet": True,
        "event_handler": on_event,
        "private_data_dir": str(private_data_dir),
        "cmdline": "--check" if dry_run else None,
    }
    if cancel_callback is not None:
        kwargs["cancel_callback"] = cancel_callback

    try:
        result = ansible_runner.run(**kwargs)
        return {
            "rc": int(getattr(result, "rc", 1)),
            "status": str(getattr(result, "status", "unknown")),
            "stats": getattr(result, "stats", None) or {},
        }
    finally:
        env_dir = private_data_dir / "env"
        if env_dir.exists():
            shutil.rmtree(env_dir, ignore_errors=True)
