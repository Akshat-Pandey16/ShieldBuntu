from __future__ import annotations

from httpx import AsyncClient

from shieldbuntu.core import auth as _auth


async def test_login_with_valid_credentials_sets_cookie(client: AsyncClient) -> None:
    _auth.set_pam_verifier(lambda u, p: u == "alice" and p == "secret")
    response = await client.post(
        "/api/auth/login", json={"username": "alice", "password": "secret"}
    )
    assert response.status_code == 200
    assert response.json() == {"username": "alice"}
    assert _auth.COOKIE_NAME in response.cookies


async def test_login_with_invalid_credentials_returns_401(client: AsyncClient) -> None:
    _auth.set_pam_verifier(lambda _u, _p: False)
    response = await client.post("/api/auth/login", json={"username": "alice", "password": "wrong"})
    assert response.status_code == 401


async def test_login_validates_empty_fields(client: AsyncClient) -> None:
    response = await client.post("/api/auth/login", json={"username": "", "password": "x"})
    assert response.status_code == 422


async def test_me_returns_current_user(client: AsyncClient) -> None:
    _auth.set_pam_verifier(lambda u, p: u == "bob" and p == "pw")
    await client.post("/api/auth/login", json={"username": "bob", "password": "pw"})
    response = await client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"username": "bob"}


async def test_me_without_session_returns_401(client: AsyncClient) -> None:
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


async def test_logout_invalidates_session(client: AsyncClient) -> None:
    _auth.set_pam_verifier(lambda u, p: u == "carol" and p == "pw")
    await client.post("/api/auth/login", json={"username": "carol", "password": "pw"})
    assert (await client.get("/api/auth/me")).status_code == 200

    logout_response = await client.post("/api/auth/logout")
    assert logout_response.status_code == 204

    after = await client.get("/api/auth/me")
    assert after.status_code == 401


async def test_invalid_session_cookie_returns_401(client: AsyncClient) -> None:
    client.cookies.set(_auth.COOKIE_NAME, "not-a-real-token")
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


async def test_health_does_not_require_auth(client: AsyncClient) -> None:
    response = await client.get("/api/health")
    assert response.status_code == 200
