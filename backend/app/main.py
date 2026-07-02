import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health, cycles, symptoms, analytics, predictions, sync, insights, export

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
        before_send=lambda event, hint: _scrub_sentry_event(event),
    )


def _scrub_sentry_event(event: dict) -> dict:
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        if "authorization" in headers:
            headers["authorization"] = "[FILTERED]"
        if "cookie" in headers:
            headers["cookie"] = "[FILTERED]"
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

# CORS: permite requests desde el frontend local (Sprint 1)
# En producción se reemplaza por el dominio de Vercel
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
