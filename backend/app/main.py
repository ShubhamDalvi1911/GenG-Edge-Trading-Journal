from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.database.database import Base, engine, upgrade_account_columns
from app.routes import accounts, analytics, auth, notifications, trades, users

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")


@app.exception_handler(ValueError)
async def handle_safe_value_error(_request: Request, _exc: ValueError):
    return JSONResponse(status_code=401, content={"detail": "Authentication is invalid or expired"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(users.router, prefix=settings.api_prefix)
app.include_router(accounts.router, prefix=settings.api_prefix)
app.include_router(trades.router, prefix=settings.api_prefix)
app.include_router(analytics.router, prefix=settings.api_prefix)
app.include_router(notifications.router, prefix=settings.api_prefix)

if settings.environment.lower() not in {"production", "prod"}:
    Base.metadata.create_all(bind=engine)
    upgrade_account_columns()


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name}
