from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.models.analytics import (
    AnalyticsSummary,
    AnalyticsSymptoms,
    AnalyticsFlow,
    AnalyticsPhases,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def analytics_summary(current_user: dict = Depends(get_current_user)):
    return await analytics_service.get_summary(user_id=current_user["user_id"])


@router.get("/symptoms", response_model=AnalyticsSymptoms)
async def analytics_symptoms(
    cycles_back: Optional[int] = Query(None, ge=1, description="Ultimos N ciclos a analizar"),
    limit: int = Query(10, ge=1, le=30),
    current_user: dict = Depends(get_current_user),
):
    return await analytics_service.get_symptoms_analytics(
        user_id=current_user["user_id"],
        cycles_back=cycles_back,
        limit=limit,
    )


@router.get("/flow", response_model=AnalyticsFlow)
async def analytics_flow(current_user: dict = Depends(get_current_user)):
    return await analytics_service.get_flow_analytics(user_id=current_user["user_id"])


@router.get("/phases", response_model=AnalyticsPhases)
async def analytics_phases(current_user: dict = Depends(get_current_user)):
    return await analytics_service.get_phases_analytics(user_id=current_user["user_id"])
