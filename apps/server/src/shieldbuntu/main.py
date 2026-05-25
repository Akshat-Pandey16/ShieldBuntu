from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from shieldbuntu import __version__
from shieldbuntu.api.auth import router as auth_router
from shieldbuntu.api.health import router as health_router
from shieldbuntu.api.runs import router as runs_router
from shieldbuntu.api.tasks import router as tasks_router
from shieldbuntu.core.auth import session_purger_loop
from shieldbuntu.core.config import get_settings
from shieldbuntu.core.db import dispose_db, init_db
from shieldbuntu.core.logging import configure_logging, get_logger
from shieldbuntu.core.startup import (
    reclaim_data_dir_ownership,
    run_pending_migrations,
)
from shieldbuntu.engine.orchestrator import wait_for_background_runs

SHUTDOWN_RUNS_TIMEOUT = 30.0


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    configure_logging(json_logs=not settings.dev_mode, level=settings.log_level)
    log = get_logger(__name__)
    run_pending_migrations()
    init_db(settings.database_url)
    reclaim_data_dir_ownership()
    purger = asyncio.create_task(session_purger_loop())
    log.info("shieldbuntu.startup", version=__version__, dev_mode=settings.dev_mode)
    try:
        yield
    finally:
        log.info("shieldbuntu.shutdown.begin")
        purger.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await purger
        try:
            await wait_for_background_runs(timeout=SHUTDOWN_RUNS_TIMEOUT)
        except Exception:
            log.exception("shieldbuntu.shutdown.bg_runs_failed")
        await dispose_db()
        log.info("shieldbuntu.shutdown.done")


def _register_error_handlers(app: FastAPI) -> None:
    log = get_logger("shieldbuntu.error")

    @app.exception_handler(StarletteHTTPException)
    async def _http_exception(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(RequestValidationError)
    async def _validation_exception(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        log.exception("api.unhandled", path=request.url.path, method=request.method)
        settings = get_settings()
        body: dict[str, object] = {"detail": "Internal server error"}
        if settings.dev_mode:
            body["error"] = str(exc)
        return JSONResponse(status_code=500, content=body)


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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )

    _register_error_handlers(app)

    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(tasks_router, prefix="/api")
    app.include_router(runs_router, prefix="/api")
    return app


app = create_app()
