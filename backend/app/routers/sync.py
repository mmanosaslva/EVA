from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.sync import SyncRequest, SyncResponse
from app.services import sync_service

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("", response_model=SyncResponse)
async def sync_operations(
    body: SyncRequest,
    current_user: dict = Depends(get_current_user),
):
    operations = [
        {
            "client_id": op.client_id,
            "type": op.type,
            "payload": op.payload,
            "client_timestamp": op.client_timestamp,
        }
        for op in body.operations
    ]
    result = await sync_service.process_sync(
        user_id=current_user["user_id"],
        operations=operations,
    )
    return SyncResponse(**result)
