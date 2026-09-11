from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user_id
from app.database.database import get_db
from app.models.account import Account
from app.models.trade import Trade
from app.schemas.account import AccountCreate, AccountRead
from app.services.email_service import send_risk_alert_if_needed
from app.services.funded_account_service import evaluate_account

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountRead])
def list_accounts(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return db.query(Account).filter(Account.user_id == user_id).all()


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountCreate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    account = Account(user_id=user_id, **payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.put("/{account_id}", response_model=AccountRead)
def update_account(account_id: int, payload: AccountCreate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
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


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Trading account not found")
    db.query(Trade).filter(Trade.account_id == account_id, Trade.user_id == user_id).delete(synchronize_session=False)
    db.delete(account)
    db.commit()
