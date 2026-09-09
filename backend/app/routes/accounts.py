from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.account import Account
from app.models.trade import Trade
from app.routes.auth import oauth2_scheme
from app.schemas.account import AccountCreate, AccountRead
from app.core.security import decode_access_token
from app.services.email_service import send_risk_alert_if_needed
from app.services.funded_account_service import evaluate_account

router = APIRouter(prefix="/accounts", tags=["accounts"])


def get_current_user_id(db: Session, token: str) -> int:
    payload = decode_access_token(token)
    return int(payload["sub"])


@router.get("", response_model=list[AccountRead])
def list_accounts(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = get_current_user_id(db, token)
    return db.query(Account).filter(Account.user_id == user_id).all()


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = get_current_user_id(db, token)
    account = Account(user_id=user_id, **payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.put("/{account_id}", response_model=AccountRead)
def update_account(account_id: int, payload: AccountCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = get_current_user_id(db, token)
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Trading account not found")
    for field, value in payload.model_dump().items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    trades = db.query(Trade).filter(Trade.account_id == account.id, Trade.user_id == user_id).all()
    send_risk_alert_if_needed(db, user_id, evaluate_account(account, trades))
    return account
