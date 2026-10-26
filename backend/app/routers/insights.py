from fastapi import APIRouter, Depends, Query, Request

from app.core.rate_limiter import limiter
from app.core.security import get_current_user
from app.models.insight import (
    InsightRequest,
    InsightResponse,
    InsightHistoryResponse,
    InsightHistoryItem,
)
from app.services import insight_service

router = APIRouter(prefix="/insights", tags=["insights"])


@router.post("", response_model=InsightResponse)
@limiter.limit("20/hour")
async def create_insight(
    request: Request,
    body: InsightRequest,
    current_user: dict = Depends(get_current_user),
):
    result = await insight_service.create_insight(
        user_id=current_user["user_id"],
        question=body.question,
        context_cycles=body.context_cycles,
    )
    return InsightResponse(**result)


@router.get("/history", response_model=InsightHistoryResponse)
async def list_insights_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    total, items = await insight_service.get_history(
        user_id=current_user["user_id"],
        limit=limit,
        offset=offset,
    )
    return InsightHistoryResponse(
        total=total,
        limit=limit,
        offset=offset,
        insights=[InsightHistoryItem(**item) for item in items],
    )
