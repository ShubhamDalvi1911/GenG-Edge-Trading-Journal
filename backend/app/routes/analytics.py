from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.trade import Trade
from app.models.account import Account
from app.routes.auth import oauth2_scheme
from app.core.security import decode_access_token
from app.services.funded_account_service import evaluate_account
from app.services.journal_analytics_service import ai_report, last_30_days, monthly_calendar

router = APIRouter(prefix="/analytics", tags=["analytics"])


def get_current_user_id(token: str) -> int:
    payload = decode_access_token(token)
    return int(payload["sub"])


@router.get("/overview")
def overview(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = get_current_user_id(token)
    trades = db.query(Trade).filter(Trade.user_id == user_id).all()
    total_pnl = sum(t.net_pnl or 0 for t in trades)
    win_rate = 0.0
    if trades:
        winners = sum(1 for t in trades if t.win_loss == "WIN")
        win_rate = round((winners / len(trades)) * 100, 2)
    return {
        "total_trades": len(trades),
        "total_pnl": round(total_pnl, 2),
        "win_rate": win_rate,
        "best_trade": max((t.net_pnl for t in trades), default=0.0),
        "worst_trade": min((t.net_pnl for t in trades), default=0.0),
    }


@router.get("/equity")
def equity(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = get_current_user_id(token)
    trades = db.query(Trade).filter(Trade.user_id == user_id).order_by(Trade.entry_time.asc()).all()
    running_balance = 0.0
    points = []
    for trade in trades:
        running_balance += float(trade.net_pnl or 0)
        points.append({"date": trade.entry_time.isoformat(), "pnl": float(trade.net_pnl or 0), "balance": round(running_balance, 2)})
    return {"points": points}


def grouped_performance(trades: list[Trade], field: str) -> list[dict]:
    groups: dict[str, list[float]] = defaultdict(list)
    for trade in trades:
        group = getattr(trade, field) or "Unassigned"
        groups[str(group)].append(float(trade.net_pnl or 0))

    result = []
    for name, values in groups.items():
        winners = [value for value in values if value > 0]
        losses = [value for value in values if value < 0]
        gross_loss = abs(sum(losses))
        result.append({
            "name": name,
            "trades": len(values),
            "pnl": round(sum(values), 2),
            "win_rate": round(len(winners) / len(values) * 100, 2) if values else 0,
            "profit_factor": round(sum(winners) / gross_loss, 2) if gross_loss else None,
            "expectancy": round(sum(values) / len(values), 2) if values else 0,
        })
    return sorted(result, key=lambda item: item["pnl"], reverse=True)


def user_trades(token: str, db: Session) -> list[Trade]:
    return db.query(Trade).filter(Trade.user_id == get_current_user_id(token)).all()


@router.get("/last-30-days")
def last_30(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    return last_30_days(user_trades(token, db))


@router.get("/calendar/{year}/{month}")
def calendar(year: int, month: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    return monthly_calendar(user_trades(token, db), year, month)


@router.get("/ai-report")
def report(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    return ai_report(user_trades(token, db))


@router.get("/funded-account/{account_id}")
def funded_account(account_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = get_current_user_id(token)
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not account:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Trading account not found")
    trades = db.query(Trade).filter(Trade.account_id == account_id, Trade.user_id == user_id).all()
    return evaluate_account(account, trades)


@router.get("/symbols")
def symbols(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    return {"items": grouped_performance(user_trades(token, db), "symbol")}


@router.get("/sessions")
def sessions(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    return {"items": grouped_performance(user_trades(token, db), "session")}


@router.get("/strategies")
def strategies(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    return {"items": grouped_performance(user_trades(token, db), "strategy")}


@router.get("/tlc")
def tlc(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    trades = user_trades(token, db)
    buckets = {
        "80-100": [trade for trade in trades if trade.tlc_score >= 80],
        "60-79": [trade for trade in trades if 60 <= trade.tlc_score < 80],
        "0-59": [trade for trade in trades if trade.tlc_score < 60],
    }
    return {
        "items": [
            {
                "name": name,
                "trades": len(bucket),
                "pnl": round(sum(float(trade.net_pnl or 0) for trade in bucket), 2),
                "win_rate": round(sum(1 for trade in bucket if trade.net_pnl > 0) / len(bucket) * 100, 2) if bucket else 0,
            }
            for name, bucket in buckets.items()
        ]
    }
