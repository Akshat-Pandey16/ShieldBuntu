from __future__ import annotations

from pathlib import Path

from shieldbuntu.engine.discovery import discover_tasks, find_task

ANSIBLE_ROOT = Path(__file__).resolve().parent.parent / "ansible"


def test_discovers_all_three_phase_one_roles() -> None:
    tasks = discover_tasks(ANSIBLE_ROOT / "roles")
    ids = {t.id for t in tasks}
    assert ids == {"kernel", "ssh", "firewall"}


def test_kernel_role_metadata_complete() -> None:
    task = find_task(ANSIBLE_ROOT / "roles", "kernel")
    assert task is not None
    assert task.name == "Kernel hardening"
    assert task.category == "kernel"
    assert "cis-l1" in task.profiles
    assert "apply" in task.capabilities
    assert "check" in task.capabilities
    assert "revert" in task.capabilities
    assert task.requires_root is True
    assert len(task.cis_refs) > 0


def test_missing_role_returns_none() -> None:
    assert find_task(ANSIBLE_ROOT / "roles", "nonexistent") is None


def test_empty_roles_dir_returns_empty(tmp_path: Path) -> None:
    assert discover_tasks(tmp_path) == []


def test_role_without_shieldbuntu_metadata_is_skipped(tmp_path: Path) -> None:
    role_dir = tmp_path / "phantom" / "meta"
    role_dir.mkdir(parents=True)
    (role_dir / "main.yml").write_text("galaxy_info:\n  author: test\n")
    assert discover_tasks(tmp_path) == []
