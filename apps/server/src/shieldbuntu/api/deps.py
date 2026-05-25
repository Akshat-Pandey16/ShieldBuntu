from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from shieldbuntu.core import auth as _auth
from shieldbuntu.models.auth import AuthSession


async def get_current_session(request: Request) -> AuthSession:
    token = _auth.extract_session_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Cookie"},
        )
    sess = await _auth.lookup_session(token)
    if sess is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    return sess


CurrentSession = Annotated[AuthSession, Depends(get_current_session)]
