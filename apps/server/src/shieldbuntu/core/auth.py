from __future__ import annotations

import asyncio
import grp
import secrets
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Final

import pamela
from fastapi import Request, Response
from sqlmodel import delete

from shieldbuntu.core.config import get_settings
from shieldbuntu.core.db import session_scope
from shieldbuntu.core.logging import get_logger
from shieldbuntu.models.auth import SESSION_REFRESH_THRESHOLD, SESSION_TTL, AuthSession

COOKIE_NAME: Final = "shieldbuntu_session"
PAM_SERVICE: Final = "sudo"
PRIVILEGED_GROUPS: Final = ("sudo", "wheel", "admin")

PamVerifier = Callable[[str, str], bool]


log = get_logger(__name__)


def _real_pam_verify(username: str, password: str) -> bool:
    try:
        pamela.authenticate(username, password, service=PAM_SERVICE)
        pamela.check_account(username, service=PAM_SERVICE)
    except pamela.PAMError as exc:
        log.info("auth.pam_denied", username=username, reason=str(exc))
        return False
    return True


def user_is_privileged(username: str) -> bool:
    for group in PRIVILEGED_GROUPS:
        try:
            members = set(grp.getgrnam(group).gr_mem)
        except KeyError:
            continue
        if username in members:
            return True
    return False


@dataclass
class _AuthState:
    verifier: PamVerifier = field(default=_real_pam_verify)
    privilege_check: Callable[[str], bool] = field(default=user_is_privileged)


_state = _AuthState()


def set_pam_verifier(verifier: PamVerifier) -> None:
    _state.verifier = verifier


def reset_pam_verifier() -> None:
    _state.verifier = _real_pam_verify


def set_privilege_check(check: Callable[[str], bool]) -> None:
    _state.privilege_check = check


def reset_privilege_check() -> None:
    _state.privilege_check = user_is_privileged


def verify_credentials(username: str, password: str) -> bool:
    return _state.verifier(username, password)


def is_authorized(username: str) -> bool:
    return _state.privilege_check(username)


@dataclass
class _Attempt:
    count: int = 0
    window_start: float = 0.0
    locked_until: float = 0.0


@dataclass
class _ThrottleState:
    attempts: dict[str, _Attempt] = field(default_factory=dict)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


_throttle = _ThrottleState()


async def check_throttle(key: str) -> float:
    settings = get_settings()
    now = time.monotonic()
    async with _throttle.lock:
        attempt = _throttle.attempts.get(key)
        if attempt is None:
            return 0.0
        if attempt.locked_until > now:
            return attempt.locked_until - now
        if attempt.locked_until and attempt.locked_until <= now:
            _throttle.attempts.pop(key, None)
            return 0.0
        if now - attempt.window_start > settings.login_window_seconds:
            _throttle.attempts.pop(key, None)
            return 0.0
    return 0.0


async def record_failure(key: str) -> float:
    settings = get_settings()
    now = time.monotonic()
    async with _throttle.lock:
        attempt = _throttle.attempts.get(key)
        if attempt is None or now - attempt.window_start > settings.login_window_seconds:
            attempt = _Attempt(count=1, window_start=now)
            _throttle.attempts[key] = attempt
            return 0.0
        attempt.count += 1
        if attempt.count >= settings.login_max_attempts:
            attempt.locked_until = now + settings.login_lockout_seconds
            return settings.login_lockout_seconds
    return 0.0


async def record_success(key: str) -> None:
    async with _throttle.lock:
        _throttle.attempts.pop(key, None)


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
        stmt = delete(AuthSession).where(AuthSession.expires_at <= datetime.now(UTC))
        result = await db.exec(stmt)  # type: ignore[call-overload]
        await db.commit()
        return int(getattr(result, "rowcount", 0) or 0)


async def session_purger_loop() -> None:
    settings = get_settings()
    interval = settings.session_purge_interval_seconds
    while True:
        try:
            await asyncio.sleep(interval)
            purged = await purge_expired_sessions()
            if purged:
                log.info("auth.sessions_purged", count=purged)
        except asyncio.CancelledError:
            return
        except Exception as exc:
            log.warning("auth.session_purger_error", error=str(exc))


def set_session_cookie(response: Response, token: str, *, secure: bool) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        secure=secure,
        samesite="strict",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/")


def extract_session_token(request: Request) -> str | None:
    return request.cookies.get(COOKIE_NAME)
