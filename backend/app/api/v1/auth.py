from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from ticketToRide.backend.app.db.session import get_db
from ticketToRide.backend.app.schemas import LoginRequest, MeResponse, RegisterRequest, UserAuthResponse
from ticketToRide.backend.app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserAuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    user = auth_service.register_user(db, request.username, request.email, request.password)
    return UserAuthResponse(user_id=user.id, username=user.username, email=user.email, token=user.auth_token or "")


@router.post("/login", response_model=UserAuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.login_user(db, request.username, request.password)
    return UserAuthResponse(user_id=user.id, username=user.username, email=user.email, token=user.auth_token or "")


@router.get("/me", response_model=MeResponse)
def me(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    token = ""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1).strip()
    user = auth_service.get_user_by_token(db, token)
    return MeResponse(user_id=user.id, username=user.username, email=user.email)

