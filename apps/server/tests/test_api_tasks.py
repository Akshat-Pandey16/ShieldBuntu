from __future__ import annotations

from httpx import AsyncClient


async def test_list_tasks_returns_three(authed_client: AsyncClient) -> None:
    response = await authed_client.get("/api/tasks")
    assert response.status_code == 200
    tasks = response.json()
    ids = {t["id"] for t in tasks}
    assert ids == {"kernel", "ssh", "firewall"}


async def test_get_task_returns_metadata(authed_client: AsyncClient) -> None:
    response = await authed_client.get("/api/tasks/kernel")
    assert response.status_code == 200
    task = response.json()
    assert task["id"] == "kernel"
    assert task["name"] == "Kernel hardening"
    assert "cis-l1" in task["profiles"]


async def test_get_unknown_task_returns_404(authed_client: AsyncClient) -> None:
    response = await authed_client.get("/api/tasks/nope")
    assert response.status_code == 404


async def test_list_tasks_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/tasks")
    assert response.status_code == 401


async def test_get_task_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/tasks/kernel")
    assert response.status_code == 401
