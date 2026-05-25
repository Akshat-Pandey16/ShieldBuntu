from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from shieldbuntu.api.deps import CurrentSession
from shieldbuntu.core import auth as _auth
from shieldbuntu.core.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=1024)


class UserResponse(BaseModel):
    username: str


@router.post("/login", response_model=UserResponse)
async def login(body: LoginRequest, request: Request, response: Response) -> UserResponse:
    settings = get_settings()
    if not _auth.verify_credentials(body.username, body.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    sess = await _auth.create_session(
        body.username,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    _auth.set_session_cookie(response, sess.token, secure=not settings.dev_mode)
    return UserResponse(username=body.username)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response) -> None:
    token = _auth.extract_session_token(request)
    if token:
        await _auth.delete_session(token)
    _auth.clear_session_cookie(response)


@router.get("/me", response_model=UserResponse)
async def me(session: CurrentSession) -> UserResponse:
    return UserResponse(username=session.username)
