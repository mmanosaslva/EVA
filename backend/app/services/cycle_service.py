from datetime import date
from typing import Optional

from fastapi import HTTPException, status

from app.repositories import cycle_repo
from app.repositories.daily_log_repo import get_logs_by_cycle


def _calc_duration(start: date, end: Optional[date]) -> Optional[int]:
    if end:
        return (end - start).days
    return None


def _row_to_dict(row, duration: Optional[int] = None) -> dict:
    data = dict(row._mapping)
    data["duration_days"] = duration or _calc_duration(data["start_date"], data.get("end_date"))
    data["id"] = str(data["id"])
    data["user_id"] = str(data["user_id"])
    data["created_at"] = data["created_at"].isoformat() if data.get("created_at") else None
    data["updated_at"] = data["updated_at"].isoformat() if data.get("updated_at") else None
    return data


async def create_cycle(user_id: str, data: dict) -> dict:
    existing = await cycle_repo.get_cycle_by_start_date(user_id, data["start_date"])
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A cycle already exists starting on this date",
        )
    row = await cycle_repo.create_cycle(user_id, data)
    return _row_to_dict(row)


async def get_cycles_by_user(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    from_date: Optional[date] = None,
) -> tuple[int, list[dict]]:
    total = await cycle_repo.count_cycles(user_id)
    rows = await cycle_repo.get_cycles_by_user(user_id, limit, offset, from_date)
    cycles = [_row_to_dict(r) for r in rows]
    return total, cycles


async def get_cycle_by_id(cycle_id: str, user_id: str) -> dict:
    row = await cycle_repo.get_cycle_by_id(cycle_id, user_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found",
        )
    cycle = _row_to_dict(row)
    logs = await get_logs_by_cycle(cycle_id)
    cycle["daily_logs"] = [_log_row_to_dict(log) for log in logs]
    return cycle


async def update_cycle(cycle_id: str, user_id: str, data: dict) -> dict:
    if "start_date" in data:
        existing = await cycle_repo.get_cycle_by_start_date(user_id, data["start_date"])
        if existing and str(existing.id) != cycle_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A cycle already exists starting on this date",
            )
    row = await cycle_repo.update_cycle(cycle_id, user_id, data)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found",
        )
    return _row_to_dict(row)


async def delete_cycle(cycle_id: str, user_id: str) -> None:
    deleted = await cycle_repo.delete_cycle(cycle_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found",
        )


def _log_row_to_dict(row) -> dict:
    data = dict(row._mapping)
    data["id"] = str(data["id"])
    data["date"] = data["date"].isoformat() if isinstance(data.get("date"), date) else data.get("date")
    data["temperature"] = float(data["temperature"]) if data.get("temperature") else None
    return data
