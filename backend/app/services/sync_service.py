import json
from datetime import date

from fastapi import HTTPException

from app.repositories import sync_repo
from app.services import cycle_service, symptom_service


def _convert_dates(payload: dict, date_fields: set[str] | None = None) -> dict:
    if date_fields is None:
        date_fields = {"start_date", "end_date", "date"}
    for key, value in payload.items():
        if key in date_fields and isinstance(value, str):
            payload[key] = date.fromisoformat(value)
    return payload


async def _resolve_id(client_id: str, batch_map: dict[str, str]) -> str:
    if client_id in batch_map:
        return batch_map[client_id]
    server_id = await sync_repo.resolve_client_id(client_id)
    if not server_id:
        raise ValueError(f"No se encontró server_id para client_id={client_id}")
    return str(server_id)


def _to_dict(row) -> dict:
    data = dict(row._mapping) if hasattr(row, "_mapping") else row
    for key in ("id", "user_id", "cycle_id", "server_id"):
        if key in data and data[key] is not None:
            data[key] = str(data[key])
    return data


async def process_sync(user_id: str, operations: list[dict]) -> dict:
    batch_map: dict[str, str] = {}
    results: list[dict] = []
    applied = 0
    skipped = 0
    failed = 0

    sorted_ops = sorted(operations, key=lambda op: op["client_timestamp"])

    for op in sorted_ops:
        client_id = op["client_id"]
        op_type = op["type"]
        original_payload = dict(op["payload"])
        payload = dict(op["payload"])
        error_msg: str | None = None
        server_id: str | None = None
        status = "applied"

        existing = await sync_repo.find_by_client_id(client_id)
        if existing:
            skipped += 1
            results.append({
                "client_id": client_id,
                "status": "skipped",
                "server_id": str(existing.server_id) if existing.server_id else None,
                "error": None,
            })
            continue

        try:
            if op_type == "CREATE_CYCLE":
                _convert_dates(payload)
                cycle = await cycle_service.create_cycle(user_id, payload)
                server_id = cycle["id"]
                batch_map[client_id] = server_id

            elif op_type == "UPDATE_CYCLE":
                cycle_client_id = payload.pop("cycle_client_id")
                server_id = await _resolve_id(cycle_client_id, batch_map)
                _convert_dates(payload)
                await cycle_service.update_cycle(server_id, user_id, payload)

            elif op_type == "DELETE_CYCLE":
                cycle_client_id = payload.pop("cycle_client_id")
                server_id = await _resolve_id(cycle_client_id, batch_map)
                await cycle_service.delete_cycle(server_id, user_id)

            elif op_type == "CREATE_DAILY_LOG":
                cycle_client_id = payload.pop("cycle_client_id")
                cycle_id = await _resolve_id(cycle_client_id, batch_map)
                payload["cycle_id"] = cycle_id
                _convert_dates(payload)
                log = await symptom_service.create_log(payload, user_id)
                server_id = log["id"]

            elif op_type == "UPDATE_DAILY_LOG":
                log_client_id = payload.pop("log_client_id")
                server_id = await _resolve_id(log_client_id, batch_map)
                _convert_dates(payload)
                await symptom_service.update_log(server_id, payload, user_id)

            elif op_type == "DELETE_DAILY_LOG":
                log_client_id = payload.pop("log_client_id")
                server_id = await _resolve_id(log_client_id, batch_map)
                await symptom_service.delete_log(server_id, user_id)

            applied += 1

        except HTTPException as exc:
            status = "failed"
            error_msg = exc.detail
            failed += 1
        except Exception as exc:
            status = "failed"
            error_msg = str(exc)
            failed += 1

        await sync_repo.insert_sync_operation({
            "user_id": user_id,
            "client_id": client_id,
            "type": op_type,
            "payload": json.dumps(original_payload),
            "status": status,
            "server_id": server_id,
        })

        results.append({
            "client_id": client_id,
            "status": status,
            "server_id": server_id,
            "error": error_msg,
        })

    return {
        "applied": applied,
        "skipped": skipped,
        "failed": failed,
        "results": results,
    }
