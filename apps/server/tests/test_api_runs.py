from __future__ import annotations

import asyncio
from collections.abc import Callable
from pathlib import Path
from typing import Any

from httpx import AsyncClient

from shieldbuntu.engine.orchestrator import set_runner


def _success_runner(
    *,
    ansible_root: Path,
    action: str,
    task_role: str,
    dry_run: bool,
    private_data_dir: Path,
    on_event: Callable[[dict[str, Any]], None],
) -> dict[str, Any]:
    on_event({"event": "playbook_on_play_start", "event_data": {"name": action}})
    on_event({"event": "playbook_on_task_start", "event_data": {"task": "apply something"}})
    on_event(
        {
            "event": "runner_on_ok",
            "event_data": {"task": "apply something", "host": "local", "res": {"changed": True}},
        }
    )
    on_event({"event": "playbook_on_stats", "event_data": {}})
    return {"rc": 0, "status": "successful", "stats": {"ok": {"local": 1}, "changed": {"local": 1}}}


def _failure_runner(
    *,
    ansible_root: Path,
    action: str,
    task_role: str,
    dry_run: bool,
    private_data_dir: Path,
    on_event: Callable[[dict[str, Any]], None],
) -> dict[str, Any]:
    on_event({"event": "playbook_on_task_start", "event_data": {"task": "boom"}})
    on_event(
        {
            "event": "runner_on_failed",
            "event_data": {"task": "boom", "host": "local", "res": {"msg": "denied"}},
        }
    )
    return {"rc": 2, "status": "failed", "stats": {}}


async def _wait_for_terminal(
    client: AsyncClient, run_id: str, *, deadline_seconds: float = 3.0
) -> dict[str, Any]:
    try:
        async with asyncio.timeout(deadline_seconds):
            while True:
                response = await client.get(f"/api/runs/{run_id}")
                assert response.status_code == 200
                body = response.json()
                if body["status"] in ("succeeded", "failed", "cancelled"):
                    return body
                await asyncio.sleep(0.02)
    except TimeoutError as exc:
        raise AssertionError(
            f"Run {run_id} did not reach terminal state within {deadline_seconds}s"
        ) from exc


async def test_start_run_succeeds_and_captures_events(client: AsyncClient) -> None:
    set_runner(_success_runner)
    response = await client.post(
        "/api/runs",
        json={"task_id": "kernel", "action": "apply", "dry_run": False},
    )
    assert response.status_code == 201
    run_id = response.json()["id"]
    final = await _wait_for_terminal(client, run_id)
    assert final["status"] == "succeeded"
    assert final["exit_code"] == 0
    assert final["summary"]["changed"] == 1

    events_response = await client.get(f"/api/runs/{run_id}/events")
    assert events_response.status_code == 200
    events = events_response.json()
    assert len(events) == 4
    assert events[0]["seq"] == 1


async def test_failed_run_marked_failed(client: AsyncClient) -> None:
    set_runner(_failure_runner)
    response = await client.post(
        "/api/runs",
        json={"task_id": "ssh", "action": "apply"},
    )
    assert response.status_code == 201
    run_id = response.json()["id"]
    final = await _wait_for_terminal(client, run_id)
    assert final["status"] == "failed"
    assert final["exit_code"] == 2


async def test_unknown_task_returns_404(client: AsyncClient) -> None:
    response = await client.post(
        "/api/runs",
        json={"task_id": "ghost", "action": "apply"},
    )
    assert response.status_code == 404


async def test_run_event_pagination_with_since_seq(client: AsyncClient) -> None:
    set_runner(_success_runner)
    response = await client.post(
        "/api/runs",
        json={"task_id": "firewall", "action": "apply"},
    )
    run_id = response.json()["id"]
    await _wait_for_terminal(client, run_id)

    later = await client.get(f"/api/runs/{run_id}/events?since_seq=2")
    assert later.status_code == 200
    events = later.json()
    assert all(e["seq"] > 2 for e in events)


async def test_list_runs_filters_by_task_id(client: AsyncClient) -> None:
    set_runner(_success_runner)
    for task_id in ("kernel", "ssh", "kernel"):
        response = await client.post("/api/runs", json={"task_id": task_id, "action": "apply"})
        assert response.status_code == 201
        await _wait_for_terminal(client, response.json()["id"])

    only_kernel = (await client.get("/api/runs?task_id=kernel")).json()
    assert len(only_kernel) == 2
    assert all(r["task_id"] == "kernel" for r in only_kernel)
