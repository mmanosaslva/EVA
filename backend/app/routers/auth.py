from fastapi import APIRouter, Depends, Request, status

from app.core.rate_limiter import limiter
from app.core.security import get_current_user
from app.services import account_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("2/day")
async def delete_account(request: Request, current_user: dict = Depends(get_current_user)):
    await account_service.delete_account(current_user["user_id"])
