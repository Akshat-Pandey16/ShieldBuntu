from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

import shieldbuntu.models  # noqa: F401


@dataclass
class _DBState:
    engine: AsyncEngine | None = None
    sessionmaker: async_sessionmaker[AsyncSession] | None = None


_state = _DBState()


def _attach_sqlite_pragmas(engine: AsyncEngine) -> None:
    @event.listens_for(engine.sync_engine, "connect")
    def _set_pragmas(dbapi_conn: object, _: object) -> None:
        cursor = dbapi_conn.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA busy_timeout=5000")
        finally:
            cursor.close()


def init_db(database_url: str) -> None:
    is_sqlite = database_url.startswith("sqlite")
    connect_args: dict[str, object] = (
        {"check_same_thread": False, "timeout": 30} if is_sqlite else {}
    )
    _state.engine = create_async_engine(
        database_url,
        future=True,
        echo=False,
        connect_args=connect_args,
    )
    if is_sqlite:
        _attach_sqlite_pragmas(_state.engine)
    _state.sessionmaker = async_sessionmaker(
        _state.engine, expire_on_commit=False, class_=AsyncSession
    )


async def dispose_db() -> None:
    if _state.engine is not None:
        await _state.engine.dispose()
    _state.engine = None
    _state.sessionmaker = None


def get_engine() -> AsyncEngine:
    if _state.engine is None:
        raise RuntimeError("Database not initialised; call init_db() first")
    return _state.engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    if _state.sessionmaker is None:
        raise RuntimeError("Database not initialised; call init_db() first")
    return _state.sessionmaker


async def get_session() -> AsyncIterator[AsyncSession]:
    async with get_sessionmaker()() as session:
        yield session


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    async with get_sessionmaker()() as session:
        yield session


async def run_metadata_create_all() -> None:
    async with get_engine().begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


SessionDep = Annotated[AsyncSession, Depends(get_session)]
