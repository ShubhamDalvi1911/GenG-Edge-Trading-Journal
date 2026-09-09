from pydantic import BaseModel, ConfigDict, EmailStr


class NotificationSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email_enabled: bool = False
    notification_email: EmailStr | None = None


class NotificationSettingsUpdate(BaseModel):
    email_enabled: bool = False
    notification_email: EmailStr | None = None
