from __future__ import annotations

from httpx import AsyncClient

from shieldbuntu import __version__


async def test_health_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body == {"status": "ok", "version": __version__}
