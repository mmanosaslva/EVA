from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health", tags=["health"])
async def health_check() -> dict:
    """
    Verifica que el servidor está activo.
    Usado por Render para health checks — no requiere auth.
    """
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }