from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GenG Edge"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./trading_journal.db"
    secret_key: str = ""
    access_token_expire_minutes: int = 60 * 24
    upload_dir: str = "./uploads"
    allowed_file_types: tuple[str, ...] = ("image/jpeg", "image/png", "image/webp")
    max_file_size_mb: int = 10
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_tls: bool = True
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://127.0.0.1:8000"
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.environment.lower() in {"production", "prod"} and len(settings.secret_key) < 32:
        raise ValueError("SECRET_KEY must be at least 32 characters in production")
    if not settings.secret_key:
        settings.secret_key = "local-development-secret-key-change-me"
    return settings
