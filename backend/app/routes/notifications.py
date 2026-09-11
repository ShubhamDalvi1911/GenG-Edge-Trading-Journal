from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user_id
from app.database.database import get_db
from app.models.notification import NotificationSettings
from app.models.trade import Trade
from app.models.user import User
from app.services.email_service import send_branded_email
from app.services.journal_analytics_service import last_30_days

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/summary/{period}")
def send_summary(period: str, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if period not in {"daily", "weekly"}:
        raise HTTPException(status_code=400, detail="Summary period must be daily or weekly")
    preferences = db.query(NotificationSettings).filter(NotificationSettings.user_id == user_id).first()
    if not preferences or not preferences.email_enabled or not preferences.notification_email:
        return {"sent": False, "reason": "Email alerts are disabled or no notification email is configured"}
    trades = db.query(Trade).filter(Trade.user_id == user_id).all()
    stats = last_30_days(trades)
    sent = send_branded_email(
        preferences.notification_email,
        f"Your GenG Edge {period} summary",
        f"You recorded {stats['total_trades']} trades in the available journal period with net P&L of ${stats['net_profit']:.2f} and a {stats['win_rate']:.1f}% win rate.",
    )
    return {"sent": sent}


@router.post("/test")
def send_test_email(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    preferences = db.query(NotificationSettings).filter(NotificationSettings.user_id == user_id).first()
    if not preferences or not preferences.email_enabled or not preferences.notification_email:
        return {"sent": False, "reason": "Email alerts are disabled or no notification email is configured"}

    user = db.query(User).filter(User.id == user_id).first()
    sent = send_branded_email(
        preferences.notification_email,
        "GenG Edge email notifications are working",
        f"Hello {user.full_name if user else 'trader'}, this is a test email from your GenG Edge journal.",
    )
    return {"sent": sent, "reason": None if sent else "SMTP delivery failed; check backend logs and SMTP settings"}
