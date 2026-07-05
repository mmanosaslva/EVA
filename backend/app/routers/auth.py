from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("2/day")
async def delete_account(request: Request, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Eliminación de cuenta no configurada. Contactá al administrador.",
        )

    supabase_admin_url = f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}"

    try:
        import httpx

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.delete(
                supabase_admin_url,
                headers={
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                },
            )
            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado",
                )
            if response.status_code >= 400:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al eliminar usuario en proveedor de autenticación",
                )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo eliminar la cuenta. Intentá de nuevo más tarde.",
        )
