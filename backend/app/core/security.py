from fastapi import Depends

from app.auth.setup import current_active_user
from app.auth.db import User


async def get_current_user(current_user: User = Depends(current_active_user)) -> dict:
    return {"user_id": str(current_user.id), "email": current_user.email}
