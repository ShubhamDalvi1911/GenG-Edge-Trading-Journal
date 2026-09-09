from sqlalchemy import Boolean, Column, ForeignKey, Integer, String

from app.database.database import Base


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    email_enabled = Column(Boolean, default=False, nullable=False)
    notification_email = Column(String, nullable=True)
