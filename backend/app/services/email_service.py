from email.message import EmailMessage
import logging
import smtplib

from app.core.config import get_settings
from app.models.notification import NotificationSettings

logger = logging.getLogger(__name__)


def send_branded_email(recipient: str, subject: str, content: str) -> bool:
    settings = get_settings()
    if not all((settings.smtp_host, settings.smtp_from_email)):
        logger.info("Email skipped: SMTP is not configured")
        return False

    message = EmailMessage()
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(content)
    message.add_alternative(
        f"""<html><body style=\"font-family:Arial,sans-serif;background:#05070d;color:#e2e8f0;padding:32px\">
        <img src=\"{settings.frontend_url}/assets/geng-edge-logo.png\" alt=\"GenG Edge logo\" width=72 style=\"display:block;margin-bottom:20px\" />
        <p style=\"color:#94a3b8;letter-spacing:2px;text-transform:uppercase;font-size:12px\">GenG Edge</p>
        <h1 style=\"color:#fff\">{subject}</h1><p style=\"line-height:1.6\">{content}</p>
        <p style=\"color:#94a3b8;font-size:12px\">Track. Analyze. Improve.</p>
        </body></html>""",
        subtype="html",
    )
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        return True
    except (OSError, smtplib.SMTPException):
        logger.exception("Unable to send GenG Edge email")
        return False


def send_verification_email(recipient: str, token: str) -> bool:
    settings = get_settings()
    link = f"{settings.frontend_url}/verify-email?token={token}"
    return send_branded_email(recipient, "Verify your GenG Edge email", f"Verify your email address by opening this link: {link}\n\nThis link expires soon. If you did not create this account, ignore this message.")


def send_password_reset_email(recipient: str, token: str) -> bool:
    settings = get_settings()
    link = f"{settings.frontend_url}/reset-password?token={token}"
    return send_branded_email(recipient, "Reset your GenG Edge password", f"Reset your password by opening this link: {link}\n\nThis link expires in one hour. If you did not request a reset, ignore this message.")


def send_risk_alert_if_needed(db, user_id: int, evaluation: dict) -> bool:
    status = evaluation["risk"]["overall_status"]
    if status not in {"BREACHED", "CRITICAL"}:
        return False
    preferences = db.query(NotificationSettings).filter(NotificationSettings.user_id == user_id).first()
    if not preferences or not preferences.email_enabled or not preferences.notification_email:
        return False
    return send_branded_email(
        preferences.notification_email,
        f"GenG Edge risk alert: {status}",
        f"Your account risk status is {status}. Daily status: {evaluation['risk']['daily_status']}; drawdown status: {evaluation['risk']['drawdown_status']}.",
    )
