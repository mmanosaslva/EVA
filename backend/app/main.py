from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

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

# ── Routers ──────────────────────────────────────────────
# Sprint 1: solo health. Los demás se agregan por sprint.
from app.routers import health
app.include_router(health.router)