import math
from datetime import date, timedelta

from app.repositories import cycle_repo
from app.repositories.ml_repo import get_ml_model
from app.services.ml_service import predict_next_cycle as ml_predict
from app.utils.cycle_utils import calculate_current_phase


def _fertile_window(predicted_start: date) -> dict:
    ovulation_date = predicted_start - timedelta(days=14)
    return {
        "start": ovulation_date - timedelta(days=5),
        "end": ovulation_date + timedelta(days=1),
    }


async def predict_next_cycle(user_id: str) -> dict:
    rows = await cycle_repo.get_cycles_by_user(user_id, limit=100, offset=0)

    if not rows:
        phase, phase_day = calculate_current_phase(None)
        return {
            "predicted_start_date": None,
            "confidence_range": {"early": None, "late": None},
            "days_until_next": None,
            "current_phase": phase,
            "current_phase_day": phase_day,
            "prediction_source": "heuristic",
            "model_mae_days": None,
            "cycles_used_for_training": None,
            "fertile_window": {"start": None, "end": None},
            "has_sufficient_data": False,
        }

    cycles = [row if isinstance(row, dict) else dict(row._mapping) for row in rows]
    cycles.sort(key=lambda c: c["start_date"])
    last_cycle = cycles[-1]
    last_cycle_dict = {
        "start_date": last_cycle["start_date"],
        "end_date": last_cycle.get("end_date"),
    }

    try:
        ml_model = await get_ml_model(user_id)
        if ml_model and ml_model.is_active:
            prophet_result = ml_predict(user_id, last_cycle["start_date"])
            if prophet_result:
                phase, phase_day = calculate_current_phase(last_cycle_dict)
                days_until_next = (prophet_result["predicted_start_date"] - date.today()).days

                return {
                    "predicted_start_date": prophet_result["predicted_start_date"],
                    "confidence_range": {
                        "early": prophet_result["confidence_range"]["early"],
                        "late": prophet_result["confidence_range"]["late"],
                    },
                    "days_until_next": days_until_next,
                    "current_phase": phase,
                    "current_phase_day": phase_day,
                    "prediction_source": "prophet",
                    "model_mae_days": float(ml_model.mae) if ml_model.mae else None,
                    "cycles_used_for_training": ml_model.cycles_used,
                    "fertile_window": _fertile_window(prophet_result["predicted_start_date"]),
                    "has_sufficient_data": True,
                }
    except Exception:
        pass

    result = await predict_next_cycle_heuristic(user_id)
    result["model_mae_days"] = None
    result["cycles_used_for_training"] = None
    return result


async def predict_next_cycle_heuristic(user_id: str) -> dict:
    rows = await cycle_repo.get_cycles_by_user(user_id, limit=100, offset=0)

    if not rows:
        phase, phase_day = calculate_current_phase(None)
        return {
            "predicted_start_date": None,
            "confidence_range": {"early": None, "late": None},
            "avg_cycle_length": 0.0,
            "cycle_variability": 0.0,
            "prediction_source": "heuristic",
            "has_sufficient_data": False,
            "last_cycle": None,
            "current_phase": phase,
            "current_phase_day": phase_day,
            "fertile_window": {"start": None, "end": None},
            "days_until_next": None,
        }

    cycles = [row if isinstance(row, dict) else dict(row._mapping) for row in rows]
    cycles.sort(key=lambda c: c["start_date"])

    last_cycle = cycles[-1]
    last_cycle_dict = {
        "start_date": last_cycle["start_date"],
        "end_date": last_cycle.get("end_date"),
    }

    if len(cycles) == 1:
        avg_cycle_length = 28.0
        cycle_variability = 0.0
    else:
        durations = [
            (cycles[i]["start_date"] - cycles[i - 1]["start_date"]).days
            for i in range(1, len(cycles))
        ]
        avg_cycle_length = round(sum(durations) / len(durations), 1)
        variance = sum((d - avg_cycle_length) ** 2 for d in durations) / len(durations)
        cycle_variability = round(math.sqrt(variance), 1)

    predicted_start_date = last_cycle["start_date"] + timedelta(days=int(round(avg_cycle_length)))

    days_until_next = (predicted_start_date - date.today()).days

    phase, phase_day = calculate_current_phase(last_cycle_dict)

    confidence_early = predicted_start_date - timedelta(days=int(cycle_variability)) if cycle_variability > 0 else None
    confidence_late = predicted_start_date + timedelta(days=int(cycle_variability)) if cycle_variability > 0 else None

    ovulation_date = predicted_start_date - timedelta(days=14)
    fertile_start = ovulation_date - timedelta(days=5)
    fertile_end = ovulation_date + timedelta(days=1)

    return {
        "predicted_start_date": predicted_start_date,
        "confidence_range": {"early": confidence_early, "late": confidence_late},
        "avg_cycle_length": avg_cycle_length,
        "cycle_variability": cycle_variability,
        "prediction_source": "heuristic",
        "has_sufficient_data": True,
        "last_cycle": last_cycle_dict,
        "current_phase": phase,
        "current_phase_day": phase_day,
        "fertile_window": {"start": fertile_start, "end": fertile_end},
        "days_until_next": days_until_next,
    }
