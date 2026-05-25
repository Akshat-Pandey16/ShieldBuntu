from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, Index
from sqlmodel import Field, Relationship, SQLModel


class RunStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    NO_CHANGE = "no_change"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RunAction(StrEnum):
    APPLY = "apply"
    REVERT = "revert"
    CHECK = "check"


class EventLevel(StrEnum):
    INFO = "info"
    CHANGE = "change"
    WARNING = "warning"
    ERROR = "error"
    FATAL = "fatal"


def _utc_now() -> datetime:
    return datetime.now(UTC)


class HardeningRun(SQLModel, table=True):
    __tablename__ = "hardening_run"
    __table_args__ = (Index("ix_hardening_run_task_started", "task_id", "started_at"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    task_id: str = Field(index=True)
    host_id: str = Field(default="local", index=True)
    action: RunAction
    dry_run: bool = False
    status: RunStatus = Field(default=RunStatus.PENDING, index=True)
    cancel_requested: bool = Field(default=False)
    initiated_by: str | None = None
    started_at: datetime = Field(default_factory=_utc_now)
    finished_at: datetime | None = None
    exit_code: int | None = None
    summary: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))

    events: list["HardeningEvent"] = Relationship(
        back_populates="run",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "order_by": "HardeningEvent.seq"},
    )


class HardeningEvent(SQLModel, table=True):
    __tablename__ = "hardening_event"
    __table_args__ = (Index("ix_hardening_event_run_seq", "run_id", "seq", unique=True),)

    id: int | None = Field(default=None, primary_key=True)
    run_id: UUID = Field(foreign_key="hardening_run.id", ondelete="CASCADE")
    seq: int
    ts: datetime = Field(default_factory=_utc_now)
    level: EventLevel = Field(default=EventLevel.INFO, index=True)
    message: str = ""
    payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

    run: HardeningRun | None = Relationship(back_populates="events")
