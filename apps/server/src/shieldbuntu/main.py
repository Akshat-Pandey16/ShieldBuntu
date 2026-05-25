from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from shieldbuntu import __version__
from shieldbuntu.api.auth import router as auth_router
from shieldbuntu.api.health import router as health_router
from shieldbuntu.api.runs import router as runs_router
from shieldbuntu.api.tasks import router as tasks_router
from shieldbuntu.core.config import get_settings
from shieldbuntu.core.db import dispose_db, init_db
from shieldbuntu.core.logging import configure_logging, get_logger


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    configure_logging(json_logs=not settings.dev_mode, level=settings.log_level)
    init_db(settings.database_url)
    log = get_logger(__name__)
    log.info("shieldbuntu.startup", version=__version__, dev_mode=settings.dev_mode)
    try:
        yield
    finally:
        await dispose_db()
        log.info("shieldbuntu.shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="ShieldBuntu",
        version=__version__,
        description="Ubuntu hardening service.",
        docs_url="/docs" if settings.dev_mode else None,
        redoc_url=None,
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )
    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(tasks_router, prefix="/api")
    app.include_router(runs_router, prefix="/api")
    return app


app = create_app()
