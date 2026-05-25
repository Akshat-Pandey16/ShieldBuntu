"""FastAPI app factory."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from shieldbuntu import __version__
from shieldbuntu.api.health import router as health_router
from shieldbuntu.core.config import get_settings
from shieldbuntu.core.logging import configure_logging, get_logger


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(json_logs=not settings.dev_mode, level=settings.log_level)
    log = get_logger(__name__)
    log.info("shieldbuntu.startup", version=__version__, dev_mode=settings.dev_mode)
    yield
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
    return app


app = create_app()
