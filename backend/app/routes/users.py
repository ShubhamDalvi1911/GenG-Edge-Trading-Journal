from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.models.notification import NotificationSettings
from app.models.account import Account
from app.models.account_token import AccountToken
from app.models.trade import Trade
from app.routes.auth import oauth2_scheme
from app.schemas.notification import NotificationSettingsRead, NotificationSettingsUpdate
from app.schemas.user import PasswordChange, UserRead
from app.core.security import get_password_hash, verify_password
from app.core.security import decode_access_token

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    return user


@router.get("/me/notifications", response_model=NotificationSettingsRead)
def read_notification_settings(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = int(decode_access_token(token)["sub"])
    settings = db.query(NotificationSettings).filter(NotificationSettings.user_id == user_id).first()
    if not settings:
        settings = NotificationSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/me/notifications", response_model=NotificationSettingsRead)
def update_notification_settings(payload: NotificationSettingsUpdate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = int(decode_access_token(token)["sub"])
    settings = db.query(NotificationSettings).filter(NotificationSettings.user_id == user_id).first()
    if not settings:
        settings = NotificationSettings(user_id=user_id)
        db.add(settings)
    settings.email_enabled = payload.email_enabled
    settings.notification_email = str(payload.notification_email) if payload.notification_email else None
    db.commit()
    db.refresh(settings)
    return settings


@router.post("/me/change-password")
def change_password(payload: PasswordChange, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = int(decode_access_token(token)["sub"])
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user or not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


@router.delete("/me", status_code=204)
def delete_account(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = int(decode_access_token(token)["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.query(Trade).filter(Trade.user_id == user_id).delete(synchronize_session=False)
    db.query(Account).filter(Account.user_id == user_id).delete(synchronize_session=False)
    db.query(NotificationSettings).filter(NotificationSettings.user_id == user_id).delete(synchronize_session=False)
    db.query(AccountToken).filter(AccountToken.user_id == user_id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
