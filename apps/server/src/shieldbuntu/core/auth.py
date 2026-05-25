from __future__ import annotations

import secrets
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Final

import pamela
from fastapi import Request, Response
from sqlmodel import select

from shieldbuntu.core.db import session_scope
from shieldbuntu.models.auth import AuthSession

COOKIE_NAME: Final = "shieldbuntu_session"
SESSION_TTL: Final = timedelta(hours=8)
SESSION_REFRESH_THRESHOLD: Final = timedelta(hours=1)
PAM_SERVICE: Final = "sudo"

PamVerifier = Callable[[str, str], bool]


def _real_pam_verify(username: str, password: str) -> bool:
    try:
        pamela.authenticate(username, password, service=PAM_SERVICE)
    except pamela.PAMError:
        return False
    return True


@dataclass
class _AuthState:
    verifier: PamVerifier


_state = _AuthState(verifier=_real_pam_verify)


def set_pam_verifier(verifier: PamVerifier) -> None:
    _state.verifier = verifier


def reset_pam_verifier() -> None:
    _state.verifier = _real_pam_verify


def verify_credentials(username: str, password: str) -> bool:
    return _state.verifier(username, password)


async def create_session(
    username: str,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuthSession:
    token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    sess = AuthSession(
        token=token,
        username=username,
        created_at=now,
        expires_at=now + SESSION_TTL,
        last_seen_at=now,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    async with session_scope() as db:
        db.add(sess)
        await db.commit()
        await db.refresh(sess)
    return sess


async def lookup_session(token: str) -> AuthSession | None:
    async with session_scope() as db:
        sess = await db.get(AuthSession, token)
        if sess is None:
            return None
        if sess.is_expired:
            await db.delete(sess)
            await db.commit()
            return None
        if datetime.now(UTC) - sess.aware_last_seen_at > SESSION_REFRESH_THRESHOLD:
            sess.last_seen_at = datetime.now(UTC)
            await db.commit()
            await db.refresh(sess)
        return sess


async def delete_session(token: str) -> None:
    async with session_scope() as db:
        sess = await db.get(AuthSession, token)
        if sess is not None:
            await db.delete(sess)
            await db.commit()


async def purge_expired_sessions() -> int:
    async with session_scope() as db:
        result = await db.exec(select(AuthSession))
        purged = 0
        for sess in result.all():
            if sess.is_expired:
                await db.delete(sess)
                purged += 1
        await db.commit()
        return purged


def set_session_cookie(response: Response, token: str, *, secure: bool) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/")


def extract_session_token(request: Request) -> str | None:
    return request.cookies.get(COOKIE_NAME)
