from datetime import date

from fastapi import HTTPException, status

from app.repositories import cycle_repo
from app.repositories.daily_log_repo import (
    create_daily_log as repo_create_log,
    get_daily_log_by_id,
    get_daily_log_by_date,
    get_logs_by_cycle_paginated,
    update_daily_log as repo_update_log,
    delete_daily_log as repo_delete_log,
    count_logs_by_cycle,
)
from app.repositories.symptom_repo import (
    get_all_symptoms,
    get_symptom_by_id,
    get_symptoms_by_log,
    add_symptoms_to_log,
    remove_all_symptoms_from_log,
)


async def list_symptoms() -> list[dict]:
    rows = await get_all_symptoms()
    return [_symptom_catalog_to_dict(r) for r in rows]


async def get_symptom(symptom_id: int) -> dict:
    row = await get_symptom_by_id(symptom_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symptom not found",
        )
    return _symptom_catalog_to_dict(row)


async def create_log(data: dict, user_id: str) -> dict:
    cycle = await cycle_repo.get_cycle_by_id(data["cycle_id"], user_id)
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found",
        )
    existing = await get_daily_log_by_date(data["cycle_id"], data["date"])
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A daily log already exists for this date in this cycle",
        )
    symptoms_payload = data.pop("symptoms", [])
    row = await repo_create_log(data)
    if symptoms_payload:
        await add_symptoms_to_log(
            log_id=str(row["id"]),
            symptoms=[{"symptom_id": s["symptom_id"], "intensity": s["intensity"]} for s in symptoms_payload],
        )
    return await _enrich_log_with_symptoms(row)


async def list_logs_by_cycle(
    cycle_id: str, user_id: str, limit: int = 50, offset: int = 0
) -> tuple[int, list[dict]]:
    cycle = await cycle_repo.get_cycle_by_id(cycle_id, user_id)
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cycle not found",
        )
    total = await count_logs_by_cycle(cycle_id)
    rows = await get_logs_by_cycle_paginated(cycle_id, limit, offset)
    logs = []
    for row in rows:
        log = _log_row_to_dict(row)
        symptoms = await get_symptoms_by_log(log["id"])
        log["symptoms"] = [_symptom_log_to_dict(s) for s in symptoms]
        logs.append(log)
    return total, logs


async def get_log(log_id: str, user_id: str) -> dict:
    row = await get_daily_log_by_id(log_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily log not found",
        )
    await _validate_log_ownership(row, user_id)
    return await _enrich_log_with_symptoms(row)


async def update_log(log_id: str, data: dict, user_id: str) -> dict:
    row = await get_daily_log_by_id(log_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily log not found",
        )
    await _validate_log_ownership(row, user_id)
    if "date" in data:
        existing = await get_daily_log_by_date(str(row.cycle_id), data["date"])
        if existing and str(existing.id) != log_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A daily log already exists for this date in this cycle",
            )
    symptoms_payload = data.pop("symptoms", None)
    updated = await repo_update_log(log_id, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily log not found",
        )
    if symptoms_payload is not None:
        await remove_all_symptoms_from_log(log_id)
        if symptoms_payload:
            await add_symptoms_to_log(
                log_id=log_id,
                symptoms=[{"symptom_id": s["symptom_id"], "intensity": s["intensity"]} for s in symptoms_payload],
            )
    return await _enrich_log_with_symptoms(updated)


async def delete_log(log_id: str, user_id: str) -> None:
    row = await get_daily_log_by_id(log_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily log not found",
        )
    await _validate_log_ownership(row, user_id)
    deleted = await repo_delete_log(log_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily log not found",
        )


async def _validate_log_ownership(row, user_id: str) -> None:
    cycle = await cycle_repo.get_cycle_by_id(str(row.cycle_id), user_id)
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily log not found",
        )


async def _enrich_log_with_symptoms(row) -> dict:
    log = _log_row_to_dict(row)
    symptoms = await get_symptoms_by_log(log["id"])
    log["symptoms"] = [_symptom_log_to_dict(s) for s in symptoms]
    return log


def _log_row_to_dict(row) -> dict:
    data = dict(row._mapping)
    data["id"] = str(data["id"])
    data["cycle_id"] = str(data["cycle_id"])
    data["date"] = data["date"].isoformat() if isinstance(data.get("date"), date) else data.get("date")
    data["temperature"] = float(data["temperature"]) if data.get("temperature") else None
    data["created_at"] = data["created_at"].isoformat() if data.get("created_at") else None
    data["updated_at"] = data["updated_at"].isoformat() if data.get("updated_at") else None
    return data


def _symptom_catalog_to_dict(row) -> dict:
    return dict(row._mapping)


def _symptom_log_to_dict(row) -> dict:
    return dict(row._mapping)
