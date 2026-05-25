from datetime import UTC, datetime, timedelta
from typing import Final

from sqlmodel import Field, SQLModel

SESSION_TTL: Final = timedelta(hours=8)
SESSION_REFRESH_THRESHOLD: Final = timedelta(hours=1)


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _default_expires_at() -> datetime:
    return _utc_now() + SESSION_TTL


def _as_aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


class AuthSession(SQLModel, table=True):
    __tablename__ = "auth_session"

    token: str = Field(primary_key=True)
    username: str = Field(index=True)
    created_at: datetime = Field(default_factory=_utc_now)
    expires_at: datetime = Field(default_factory=_default_expires_at, index=True)
    last_seen_at: datetime = Field(default_factory=_utc_now)
    ip_address: str | None = None
    user_agent: str | None = None

    @property
    def is_expired(self) -> bool:
        return _utc_now() >= _as_aware(self.expires_at)

    @property
    def aware_last_seen_at(self) -> datetime:
        return _as_aware(self.last_seen_at)

    @property
    def aware_expires_at(self) -> datetime:
        return _as_aware(self.expires_at)
