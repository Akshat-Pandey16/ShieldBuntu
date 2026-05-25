from __future__ import annotations

import os
import pwd

from fastapi import APIRouter
from pydantic import BaseModel

from shieldbuntu import __version__

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    version: str
    running_as_root: bool
    daemon_user: str


def _current_username() -> str:
    try:
        return pwd.getpwuid(os.geteuid()).pw_name
    except KeyError:
        return f"uid:{os.geteuid()}"


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        running_as_root=os.geteuid() == 0,
        daemon_user=_current_username(),
    )
