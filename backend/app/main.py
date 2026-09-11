from time import perf_counter

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.database.database import Base, engine, upgrade_account_columns
from app.routes import accounts, analytics, auth, notifications, trades, users

settings = get_settings()

app = FastAPI(title=settings.app_name, version="1.0.0", docs_url=None if settings.environment.lower() in {"production", "prod"} else "/docs", redoc_url=None if settings.environment.lower() in {"production", "prod"} else "/redoc")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        started = perf_counter()
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-Process-Time"] = f"{perf_counter() - started:.4f}"
        if settings.environment.lower() in {"production", "prod"}:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
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


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, headers=exc.headers, content={"detail": exc.detail})


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name, "version": "1.0.0"}
