from datetime import date, timedelta
from statistics import pstdev

from app.repositories import cycle_repo
from app.services.cycle_forecast import DEFAULT_CYCLE_LENGTH, median_length
from app.utils.cycle_utils import calculate_current_phase


def _fertile_window(predicted_start: date) -> dict:
    ovulation_date = predicted_start - timedelta(days=14)
    return {
        "start": ovulation_date - timedelta(days=5),
        "end": ovulation_date + timedelta(days=1),
    }


async def predict_next_cycle(user_id: str) -> dict:
    """Predice el próximo ciclo con la mediana de las duraciones de la usuaria.

    La mediana ganó la evaluación de T24 (Docs/s10/evaluacion-prediccion.md): mismo error que
    el promedio en ciclos regulares e irregulares y mucho menor cuando hay un ciclo atípico.
    """
    rows = await cycle_repo.get_cycles_by_user(user_id, limit=100, offset=0)

    if not rows:
        phase, phase_day = calculate_current_phase(None)
        return {
            "predicted_start_date": None,
            "confidence_range": {"early": None, "late": None},
            "predicted_cycle_length": None,
            "cycle_variability": 0.0,
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

    durations = [
        (cycles[i]["start_date"] - cycles[i - 1]["start_date"]).days
        for i in range(1, len(cycles))
    ]
    predicted_cycle_length = median_length(durations) if durations else DEFAULT_CYCLE_LENGTH
    cycle_variability = round(pstdev(durations), 1) if len(durations) > 1 else 0.0

    predicted_start_date = last_cycle["start_date"] + timedelta(days=int(round(predicted_cycle_length)))
    margin = timedelta(days=int(cycle_variability))

    phase, phase_day = calculate_current_phase({
        "start_date": last_cycle["start_date"],
        "end_date": last_cycle.get("end_date"),
    })

    return {
        "predicted_start_date": predicted_start_date,
        "confidence_range": {
            "early": predicted_start_date - margin if cycle_variability > 0 else None,
            "late": predicted_start_date + margin if cycle_variability > 0 else None,
        },
        "predicted_cycle_length": predicted_cycle_length,
        "cycle_variability": cycle_variability,
        "days_until_next": (predicted_start_date - date.today()).days,
        "current_phase": phase,
        "current_phase_day": phase_day,
        "prediction_source": "heuristic",
        "model_mae_days": None,
        "cycles_used_for_training": None,
        "fertile_window": _fertile_window(predicted_start_date),
        "has_sufficient_data": True,
    }
