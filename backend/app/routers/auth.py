from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete

from app.core.db import engine
from app.core.rate_limiter import limiter
from app.core.security import get_current_user
from app.auth.db import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("2/day")
async def delete_account(request: Request, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    async with engine.begin() as conn:
        result = await conn.execute(delete(User).where(User.id == user_id))
        if result.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
