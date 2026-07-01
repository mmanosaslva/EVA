from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from app.core.security import get_current_user
from app.models.cycle import CycleCreate, CycleUpdate, CycleResponse, CycleListResponse
from app.services import cycle_service

router = APIRouter(prefix="/cycles", tags=["cycles"])


@router.post("", response_model=CycleResponse, status_code=status.HTTP_201_CREATED)
async def create_cycle(
    body: CycleCreate,
    current_user: dict = Depends(get_current_user),
):
    return await cycle_service.create_cycle(
        user_id=current_user["user_id"],
        data=body.model_dump(exclude_none=True),
    )


@router.get("", response_model=CycleListResponse)
async def list_cycles(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    from_date: Optional[date] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    total, cycles = await cycle_service.get_cycles_by_user(
        user_id=current_user["user_id"],
        limit=limit,
        offset=offset,
        from_date=from_date,
    )
    return CycleListResponse(total=total, limit=limit, offset=offset, cycles=cycles)


@router.get("/{cycle_id}", response_model=CycleResponse)
async def get_cycle(
    cycle_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await cycle_service.get_cycle_by_id(
        cycle_id=cycle_id,
        user_id=current_user["user_id"],
    )


@router.put("/{cycle_id}", response_model=CycleResponse)
async def update_cycle(
    cycle_id: str,
    body: CycleUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await cycle_service.update_cycle(
        cycle_id=cycle_id,
        user_id=current_user["user_id"],
        data=body.model_dump(exclude_none=True),
    )


@router.delete("/{cycle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cycle(
    cycle_id: str,
    current_user: dict = Depends(get_current_user),
):
    await cycle_service.delete_cycle(
        cycle_id=cycle_id,
        user_id=current_user["user_id"],
    )
