from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from shieldbuntu.core.config import get_settings
from shieldbuntu.core.db import dispose_db, init_db, run_metadata_create_all
from shieldbuntu.engine.discovery import _cached_discover
from shieldbuntu.engine.orchestrator import (
    reset_runner,
    wait_for_background_runs,
)
from shieldbuntu.main import create_app

ANSIBLE_ROOT = Path(__file__).resolve().parent.parent / "ansible"


@pytest.fixture(autouse=True)
def _configure_settings(tmp_path: Path) -> None:
    settings = get_settings()
    settings.data_dir = tmp_path / "data"
    settings.ansible_root = ANSIBLE_ROOT
    settings.dev_mode = True
    _cached_discover.cache_clear()


@pytest.fixture
async def client(tmp_path: Path) -> AsyncIterator[AsyncClient]:
    db_url = f"sqlite+aiosqlite:///{tmp_path / 'test.db'}"
    init_db(db_url)
    await run_metadata_create_all()
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await wait_for_background_runs()
    reset_runner()
    await dispose_db()
