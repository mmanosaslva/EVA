from fastapi import APIRouter, Depends, Query, status

from app.core.security import get_current_user
from app.models.symptom import (
    SymptomResponse,
    DailyLogCreate,
    DailyLogUpdate,
    DailyLogResponse,
    DailyLogListResponse,
)
from app.services import symptom_service

symptoms_router = APIRouter(prefix="/symptoms", tags=["symptoms"])

daily_logs_router = APIRouter(prefix="/daily-logs", tags=["daily-logs"])


@symptoms_router.get("", response_model=list[SymptomResponse])
async def list_symptoms():
    return await symptom_service.list_symptoms()


@symptoms_router.get("/{symptom_id}", response_model=SymptomResponse)
async def get_symptom(symptom_id: int):
    return await symptom_service.get_symptom(symptom_id)


@daily_logs_router.post("", response_model=DailyLogResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_log(
    body: DailyLogCreate,
    current_user: dict = Depends(get_current_user),
):
    return await symptom_service.create_log(
        data=body.model_dump(exclude_none=True),
        user_id=current_user["user_id"],
    )


@daily_logs_router.get("", response_model=DailyLogListResponse)
async def list_daily_logs(
    cycle_id: str = Query(...),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    total, logs = await symptom_service.list_logs_by_cycle(
        cycle_id=cycle_id,
        user_id=current_user["user_id"],
        limit=limit,
        offset=offset,
    )
    return DailyLogListResponse(total=total, limit=limit, offset=offset, logs=logs)


@daily_logs_router.get("/{log_id}", response_model=DailyLogResponse)
async def get_daily_log(
    log_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await symptom_service.get_log(
        log_id=log_id,
        user_id=current_user["user_id"],
    )


@daily_logs_router.put("/{log_id}", response_model=DailyLogResponse)
async def update_daily_log(
    log_id: str,
    body: DailyLogUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await symptom_service.update_log(
        log_id=log_id,
        data=body.model_dump(exclude_none=True),
        user_id=current_user["user_id"],
    )


@daily_logs_router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_log(
    log_id: str,
    current_user: dict = Depends(get_current_user),
):
    await symptom_service.delete_log(
        log_id=log_id,
        user_id=current_user["user_id"],
    )
