import hashlib
import hmac
import secrets

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ticketToRide.backend.app.models import User


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def register_user(db: Session, username: str, email: str, password: str) -> User:
    username_clean = username.strip()
    email_clean = email.strip().lower()

    user_exists = db.scalar(select(User.id).where(func.lower(User.username) == username_clean.lower()))
    if user_exists:
        raise HTTPException(status_code=400, detail="Username already exists")

    email_exists = db.scalar(select(User.id).where(func.lower(User.email) == email_clean))
    if email_exists:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=username_clean,
        email=email_clean,
        password_hash=_hash_password(password),
        auth_token=secrets.token_hex(32),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, username: str, password: str) -> User:
    user = db.scalar(select(User).where(func.lower(User.username) == username.strip().lower()))
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    candidate_hash = _hash_password(password)
    if not hmac.compare_digest(user.password_hash, candidate_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.auth_token = secrets.token_hex(32)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_token(db: Session, token: str) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    user = db.scalar(select(User).where(User.auth_token == token))
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

