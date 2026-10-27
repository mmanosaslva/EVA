from fastapi import APIRouter, Depends, status

from app.core.rate_limit import limit_per_user
from app.core.security import get_current_user
from app.services import account_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.delete(
    "/account",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(limit_per_user("delete-account", 2, 86400))],
)
async def delete_account(current_user: dict = Depends(get_current_user)):
    await account_service.delete_account(current_user["user_id"])
