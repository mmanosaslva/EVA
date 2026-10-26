from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health", tags=["health"])
async def health_check() -> dict:
    """
    Verifica que el servidor está activo.
    Usado para health checks del hosting y del monitoreo — no requiere auth.
    """
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }