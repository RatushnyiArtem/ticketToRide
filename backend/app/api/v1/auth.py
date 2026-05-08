from fastapi import APIRouter, Depends, Header, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas import LoginRequest, MeResponse, RegisterRequest, UserAuthResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _extract_token(request: Request, authorization: str | None) -> str:
    cookie_token = (request.cookies.get(settings.auth_cookie_name) or "").strip()
    if cookie_token:
        return cookie_token

    if authorization and authorization.startswith("Bearer "):
        return authorization.replace("Bearer ", "", 1).strip()
    return ""


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=settings.auth_cookie_max_age_seconds,
        path="/",
    )


@router.post("/register", response_model=UserAuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    user = auth_service.register_user(db, request.username, request.email, request.password)
    _set_auth_cookie(response, user.auth_token or "")
    return UserAuthResponse(user_id=user.id, username=user.username, email=user.email, token=user.auth_token or "")


@router.post("/login", response_model=UserAuthResponse)
def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = auth_service.login_user(db, request.username, request.password)
    _set_auth_cookie(response, user.auth_token or "")
    return UserAuthResponse(user_id=user.id, username=user.username, email=user.email, token=user.auth_token or "")


@router.get("/me", response_model=MeResponse)
def me(request: Request, authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    token = _extract_token(request, authorization)
    user = auth_service.get_user_by_token(db, token)
    return MeResponse(user_id=user.id, username=user.username, email=user.email)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = _extract_token(request, authorization)
    auth_service.revoke_token(db, token)
    response.delete_cookie(key=settings.auth_cookie_name, path="/")
    return None


