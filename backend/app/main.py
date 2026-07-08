import asyncio

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.security_middleware import SecurityHeadersMiddleware
from app.routers import auth, health, cycles, symptoms, analytics, predictions, sync, insights, export
from app.auth.db import create_db_and_tables
from app.core.db import engine
from app.auth.setup import fastapi_users, auth_backend
from app.auth.schemas import UserRead, UserCreate, UserUpdate


_KEEPALIVE_INTERVAL = 240  # Neon suspende tras 5 min idle → ping cada 4 min


if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
        send_default_pii=False,
        before_send=lambda event, hint: _scrub_sentry_event(event),
    )

_SENSITIVE_ENDPOINTS = ("/daily-logs", "/cycles", "/insights")


def _scrub_sentry_event(event: dict) -> dict:
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        if "authorization" in headers:
            headers["authorization"] = "[FILTERED]"
        if "cookie" in headers:
            headers["cookie"] = "[FILTERED]"
        url = event["request"].get("url", "")
        if any(ep in url for ep in _SENSITIVE_ENDPOINTS):
            event["request"].pop("data", None)
            event["request"].pop("json", None)
    if "extra" in event:
        for key in ("email", "user_id", "token", "password", "birth_date"):
            event["extra"].pop(key, None)
    if "user" in event:
        event["user"] = {"ip_address": "[FILTERED]"}
    return event


app = FastAPI(
    title="EVA API",
    description="Backend de EVA — Plataforma de Salud Menstrual",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.on_event("startup")
async def startup():
    await create_db_and_tables()
    # Pre-warm pool: wake up Neon compute + keep connections ready
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))

    # Keepalive: evita que Neon suspenda el compute tras 5 min idle
    async def _keepalive():
        while True:
            await asyncio.sleep(_KEEPALIVE_INTERVAL)
            try:
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))
            except Exception:
                pass  # Lo intentará de nuevo en el próximo ciclo

    asyncio.create_task(_keepalive())


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(cycles.router)
app.include_router(symptoms.symptoms_router)
app.include_router(symptoms.daily_logs_router)
app.include_router(analytics.router)
app.include_router(predictions.router)
app.include_router(sync.router)
app.include_router(insights.router)
app.include_router(export.router)

app.include_router(auth.router)

app.include_router(
    fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"]
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)
