from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user
from app.models.insight import (
    InsightRequest,
    InsightResponse,
    InsightHistoryResponse,
    InsightHistoryItem,
)
from app.repositories import insight_repo
from app.services import llm_service

router = APIRouter(prefix="/insights", tags=["insights"])


@router.post("", response_model=InsightResponse)
async def create_insight(
    body: InsightRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id: str = current_user["user_id"]

    cycle_context = await llm_service.build_cycle_context(
        user_id=user_id,
        context_cycles=body.context_cycles,
    )

    try:
        result = await llm_service.get_insight(
            question=body.question,
            cycle_context=cycle_context,
        )
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service temporarily unavailable. Please try again later.",
        )

    await insight_repo.save_insight(
        user_id=user_id,
        question=body.question,
        insight=result["insight"],
        phase=cycle_context.get("fase_actual"),
        source=result["source"],
    )

    return InsightResponse(
        insight=result["insight"],
        phase=cycle_context.get("fase_actual"),
        source=result["source"],
        disclaimer=result["disclaimer"],
    )


@router.get("/history", response_model=InsightHistoryResponse)
async def list_insights_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    user_id: str = current_user["user_id"]
    total, rows = await insight_repo.get_insights_history(
        user_id=user_id,
        limit=limit,
        offset=offset,
    )

    insights = []
    for row in rows:
        data = dict(row._mapping)
        insights.append(
            InsightHistoryItem(
                id=str(data["id"]),
                question=data["question"],
                insight=data["insight"],
                phase=data.get("phase"),
                source=data["source"],
                created_at=data["created_at"],
            )
        )

    return InsightHistoryResponse(
        total=total,
        limit=limit,
        offset=offset,
        insights=insights,
    )
