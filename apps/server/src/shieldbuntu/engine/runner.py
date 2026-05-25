from __future__ import annotations

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
) -> dict[str, Any]:
    private_data_dir.mkdir(parents=True, exist_ok=True)

    playbook_path = ansible_root / "playbooks" / f"{action}.yml"
    inventory_path = ansible_root / "inventory" / "localhost.yml"

    result = ansible_runner.run(
        playbook=str(playbook_path),
        inventory=str(inventory_path),
        extravars={"task_role": task_role},
        envvars={
            "ANSIBLE_ROLES_PATH": str(ansible_root / "roles"),
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
        },
        quiet=True,
        event_handler=on_event,
        private_data_dir=str(private_data_dir),
        cmdline="--check" if dry_run else None,
    )

    return {
        "rc": int(getattr(result, "rc", 1)),
        "status": str(getattr(result, "status", "unknown")),
        "stats": getattr(result, "stats", None) or {},
    }
