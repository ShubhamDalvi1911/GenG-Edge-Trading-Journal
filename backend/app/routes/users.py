from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_current_user_id
from app.database.database import get_db
from app.models.user import User
from app.models.notification import NotificationSettings
from app.models.account import Account
from app.models.account_token import AccountToken
from app.models.trade import Trade
from app.schemas.notification import NotificationSettingsRead, NotificationSettingsUpdate
from app.schemas.user import PasswordChange, UserRead, UserUpdate
from app.core.security import get_password_hash, verify_password

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserRead)
def update_current_user(payload: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip() or None
    if payload.username is not None:
        current_user.username = payload.username.strip() or None
    if "avatar_url" in payload.model_fields_set:
        current_user.avatar_url = payload.avatar_url.strip() if payload.avatar_url else None
    if payload.avatar_zoom is not None:
        current_user.avatar_zoom = payload.avatar_zoom
    if payload.avatar_position is not None:
        current_user.avatar_position = payload.avatar_position
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/notifications", response_model=NotificationSettingsRead)
def read_notification_settings(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    settings = db.query(NotificationSettings).filter(NotificationSettings.user_id == user_id).first()
    if not settings:
        settings = NotificationSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/me/notifications", response_model=NotificationSettingsRead)
def update_notification_settings(payload: NotificationSettingsUpdate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
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
def change_password(payload: PasswordChange, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


@router.delete("/me", status_code=204)
def delete_account(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.query(Trade).filter(Trade.user_id == user_id).delete(synchronize_session=False)
    db.query(Account).filter(Account.user_id == user_id).delete(synchronize_session=False)
    db.query(NotificationSettings).filter(NotificationSettings.user_id == user_id).delete(synchronize_session=False)
    db.query(AccountToken).filter(AccountToken.user_id == user_id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
