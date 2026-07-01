from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class SyncOperation(BaseModel):
    client_id: str
    type: Literal[
        "CREATE_CYCLE",
        "UPDATE_CYCLE",
        "DELETE_CYCLE",
        "CREATE_DAILY_LOG",
        "UPDATE_DAILY_LOG",
        "DELETE_DAILY_LOG",
    ]
    payload: dict
    client_timestamp: datetime


class SyncRequest(BaseModel):
    operations: list[SyncOperation]


class SyncResult(BaseModel):
    client_id: str
    status: Literal["applied", "skipped", "failed"]
    server_id: Optional[str] = None
    error: Optional[str] = None


class SyncResponse(BaseModel):
    applied: int
    skipped: int
    failed: int
    results: list[SyncResult]
