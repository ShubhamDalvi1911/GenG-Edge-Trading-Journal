from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.account import Account
from app.models.trade import Trade
from app.routes.auth import oauth2_scheme
from app.schemas.trade import TradeCreate, TradeRead
from app.core.security import decode_access_token
from app.services.trade_service import upsert_trade_metrics
from app.services.email_service import send_risk_alert_if_needed
from app.services.funded_account_service import evaluate_account

router = APIRouter(prefix="/trades", tags=["trades"])


def get_current_user_id(token: str) -> int:
    payload = decode_access_token(token)
    return int(payload["sub"])


@router.get("", response_model=list[TradeRead])
def list_trades(
    token: str = Depends(oauth2_scheme),
    account_id: int | None = None,
    symbol: str | None = None,
    db: Session = Depends(get_db),
):
    user_id = get_current_user_id(token)
    query = db.query(Trade).filter(Trade.user_id == user_id)
    if account_id is not None:
        query = query.filter(Trade.account_id == account_id)
    if symbol is not None:
        query = query.filter(Trade.symbol.ilike(f"%{symbol}%"))
    return query.order_by(Trade.entry_time.desc()).all()


@router.post("", response_model=TradeRead, status_code=status.HTTP_201_CREATED)
def create_trade(payload: TradeCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = get_current_user_id(token)

    account = db.query(Account).filter(Account.id == payload.account_id, Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Trading account not found")

    if payload.exit_time < payload.entry_time:
        raise HTTPException(status_code=400, detail="Exit time must be greater than or equal to entry time")

    trade = Trade(user_id=user_id, **payload.model_dump())
    trade.entry_time = trade.entry_time.astimezone().replace(tzinfo=None) if trade.entry_time.tzinfo else trade.entry_time
    trade.exit_time = trade.exit_time.astimezone().replace(tzinfo=None) if trade.exit_time.tzinfo else trade.exit_time
    trade.market_data = payload.market_data or {"contract_size": 100000, "currency": "USD"}
    db.add(trade)
    db.commit()
    upsert_trade_metrics(trade, db)
    db.commit()
    db.refresh(trade)
    send_risk_alert_if_needed(db, user_id, evaluate_account(account, db.query(Trade).filter(Trade.account_id == account.id, Trade.user_id == user_id).all()))
    return trade


@router.get("/{trade_id}", response_model=TradeRead)
def get_trade(trade_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = get_current_user_id(token)
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == user_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.put("/{trade_id}", response_model=TradeRead)
def update_trade(trade_id: int, payload: TradeCreate, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = get_current_user_id(token)
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == user_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    account = db.query(Account).filter(Account.id == payload.account_id, Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Trading account not found")
    if payload.exit_time < payload.entry_time:
        raise HTTPException(status_code=400, detail="Exit time must be greater than or equal to entry time")

    for field, value in payload.model_dump().items():
        setattr(trade, field, value)
    upsert_trade_metrics(trade, db)
    db.commit()
    db.refresh(trade)
    send_risk_alert_if_needed(db, user_id, evaluate_account(account, db.query(Trade).filter(Trade.account_id == account.id, Trade.user_id == user_id).all()))
    return trade


@router.delete("/{trade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trade(trade_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = get_current_user_id(token)
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == user_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    db.delete(trade)
    db.commit()
