from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import ACCESS_COOKIE_NAME, get_current_user, oauth2_scheme
from app.core.rate_limit import auth_limiter, client_key, password_reset_limiter
from app.core.security import create_access_token, create_one_time_token, get_password_hash, hash_one_time_token, verify_password
from app.database.database import get_db
from app.models.account_token import AccountToken
from app.models.user import User
from app.schemas.user import PasswordResetConfirm, PasswordResetRequest, TokenResponse, UserCreate, UserLogin, UserRead
from app.services.email_service import send_password_reset_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.environment.lower() in {"production", "prod"},
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(response: Response, request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    auth_limiter.check(client_key(request, "register"))
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    raw_token, token_hash = create_one_time_token()
    db.add(AccountToken(user_id=user.id, token_hash=token_hash, purpose="verify_email", expires_at=datetime.now(timezone.utc) + timedelta(hours=24)))
    db.commit()
    send_verification_email(user.email, raw_token)

    token = create_access_token(user.id)
    _set_session_cookie(response, token)
    return {"access_token": token, "token_type": "bearer", "user": UserRead.model_validate(user)}


@router.post("/login", response_model=TokenResponse)
def login_user(response: Response, request: Request, payload: UserLogin, db: Session = Depends(get_db)):
    auth_limiter.check(client_key(request, "login"))
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id)
    _set_session_cookie(response, token)
    return {"access_token": token, "token_type": "bearer", "user": UserRead.model_validate(user)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    return {"message": "Signed out successfully."}


@router.post("/forgot-password")
def forgot_password(request: Request, payload: PasswordResetRequest, db: Session = Depends(get_db)):
    password_reset_limiter.check(client_key(request, "forgot-password"))
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    development_reset_url = None
    if user and user.is_active:
        raw_token, token_hash = create_one_time_token()
        db.add(AccountToken(user_id=user.id, token_hash=token_hash, purpose="password_reset", expires_at=datetime.now(timezone.utc) + timedelta(hours=1)))
        db.commit()
        email_sent = send_password_reset_email(user.email, raw_token)
        if not email_sent and settings.environment.lower() not in {"production", "prod"}:
            development_reset_url = f"{settings.frontend_url}/reset-password?token={raw_token}"
    response = {"message": "If an account exists for that email, reset instructions have been sent."}
    if development_reset_url:
        response["development_reset_url"] = development_reset_url
    return response


@router.post("/reset-password")
def reset_password(request: Request, payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    password_reset_limiter.check(client_key(request, "reset-password"))
    token_record = db.query(AccountToken).filter(AccountToken.token_hash == hash_one_time_token(payload.token), AccountToken.purpose == "password_reset", AccountToken.used_at.is_(None)).first()
    if not token_record or token_record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token is invalid or expired")
    user = db.query(User).filter(User.id == token_record.user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=400, detail="Reset token is invalid or expired")
    user.hashed_password = get_password_hash(payload.password)
    token_record.used_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Password has been reset. You can now sign in."}


@router.post("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    token_record = db.query(AccountToken).filter(AccountToken.token_hash == hash_one_time_token(token), AccountToken.purpose == "verify_email", AccountToken.used_at.is_(None)).first()
    if not token_record or token_record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token is invalid or expired")
    user = db.query(User).filter(User.id == token_record.user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=400, detail="Verification token is invalid or expired")
    user.is_verified = True
    token_record.used_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Email verified successfully."}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
