from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest
import yaml

ANSIBLE_ROOT = Path(__file__).resolve().parent.parent / "ansible"
ROLE_NAMES = ["kernel", "ssh", "firewall"]


def test_playbooks_parse_as_valid_yaml() -> None:
    for name in ("apply.yml", "check.yml", "revert.yml"):
        content = yaml.safe_load((ANSIBLE_ROOT / "playbooks" / name).read_text())
        assert isinstance(content, list)
        assert content
        assert "hosts" in content[0]


@pytest.mark.parametrize("role", ROLE_NAMES)
def test_role_has_required_files(role: str) -> None:
    base = ANSIBLE_ROOT / "roles" / role
    assert (base / "meta" / "main.yml").exists()
    assert (base / "defaults" / "main.yml").exists()
    assert (base / "tasks" / "main.yml").exists()
    assert (base / "tasks" / "revert.yml").exists()


@pytest.mark.parametrize("role", ROLE_NAMES)
def test_role_meta_has_shieldbuntu_block(role: str) -> None:
    meta = yaml.safe_load((ANSIBLE_ROOT / "roles" / role / "meta" / "main.yml").read_text())
    assert "shieldbuntu" in meta
    sb = meta["shieldbuntu"]
    assert sb["name"]
    assert sb["description"]
    assert isinstance(sb["profiles"], list)
    assert isinstance(sb["capabilities"], list)


@pytest.mark.parametrize(
    "role_tasks", [(role, kind) for role in ROLE_NAMES for kind in ("main.yml", "revert.yml")]
)
def test_role_tasks_parse_as_list(role_tasks: tuple[str, str]) -> None:
    role, kind = role_tasks
    content = yaml.safe_load((ANSIBLE_ROOT / "roles" / role / "tasks" / kind).read_text())
    assert isinstance(content, list)
    assert content


@pytest.mark.skipif(shutil.which("ansible-playbook") is None, reason="ansible-playbook not on PATH")
@pytest.mark.parametrize("playbook", ["apply.yml", "check.yml", "revert.yml"])
def test_ansible_syntax_check(playbook: str, tmp_path: Path) -> None:
    ansible_bin = shutil.which("ansible-playbook")
    assert ansible_bin is not None
    env = {
        **os.environ,
        "ANSIBLE_ROLES_PATH": str(ANSIBLE_ROOT / "roles"),
        "HOME": str(tmp_path),
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
    }
    result = subprocess.run(
        [
            ansible_bin,
            "--syntax-check",
            "-i",
            str(ANSIBLE_ROOT / "inventory" / "localhost.yml"),
            "-e",
            "task_role=kernel",
            str(ANSIBLE_ROOT / "playbooks" / playbook),
        ],
        cwd=str(ANSIBLE_ROOT),
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    assert result.returncode == 0, (
        f"Syntax check failed for {playbook}:\n{result.stdout}\n{result.stderr}"
    )
