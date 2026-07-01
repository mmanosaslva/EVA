from typing import Optional

from app.repositories.analytics_repo import (
    get_cycle_stats,
    get_cycle_count,
    get_bleeding_days_per_cycle,
    get_last_cycle_ids,
    get_all_cycle_ids,
    count_logs_for_cycles,
    get_symptom_frequencies,
    get_flow_distribution,
    count_logs_for_user,
)


async def get_summary(user_id: str) -> dict:
    total_cycles = await get_cycle_count(user_id)
    if total_cycles == 0:
        return {
            "total_cycles": 0,
            "avg_cycle_duration": 0.0,
            "avg_period_duration": 0.0,
            "cycle_variability_days": 0.0,
            "shortest_cycle": None,
            "longest_cycle": None,
            "last_cycle_start": None,
        }
    stats = await get_cycle_stats(user_id)
    bleeding_days = await get_bleeding_days_per_cycle(user_id)
    avg_period = round(sum(bleeding_days) / len(bleeding_days), 1) if bleeding_days else 0.0
    return {
        "total_cycles": total_cycles,
        "avg_cycle_duration": float(stats["avg_duration"]) if stats["avg_duration"] else 0.0,
        "avg_period_duration": avg_period,
        "cycle_variability_days": float(stats["variability"]) if stats["variability"] else 0.0,
        "shortest_cycle": stats["shortest"],
        "longest_cycle": stats["longest"],
        "last_cycle_start": stats["last_start"],
    }


async def get_symptoms_analytics(user_id: str, cycles_back: Optional[int], limit: int) -> dict:
    if cycles_back:
        cycle_ids = await get_last_cycle_ids(user_id, cycles_back)
    else:
        cycle_ids = await get_all_cycle_ids(user_id)
    cycles_analyzed = len(cycle_ids)
    if cycles_analyzed == 0:
        return {"symptoms": [], "cycles_analyzed": 0, "total_logs_analyzed": 0}
    total_logs = await count_logs_for_cycles(cycle_ids)
    symptom_rows = await get_symptom_frequencies(cycle_ids, limit)
    symptoms = []
    for row in symptom_rows:
        freq = float(row["occurrences"]) / total_logs if total_logs > 0 else 0.0
        symptoms.append({
            "symptom_id": row["symptom_id"],
            "name": row["name"],
            "category": row["category"],
            "frequency": round(freq, 4),
            "avg_intensity": float(row["avg_intensity"]) if row["avg_intensity"] else 0.0,
        })
    return {
        "symptoms": symptoms,
        "cycles_analyzed": cycles_analyzed,
        "total_logs_analyzed": total_logs,
    }


async def get_flow_analytics(user_id: str) -> dict:
    distribution = await get_flow_distribution(user_id)
    total = await count_logs_for_user(user_id)
    return {"distribution": distribution, "total_days_analyzed": total}


async def get_phases_analytics(user_id: str) -> dict:
    total_cycles = await get_cycle_count(user_id)
    if total_cycles == 0:
        return {
            "avg_menstruation_days": 0.0,
            "avg_follicular_days": 0.0,
            "avg_ovulation_days": 0.0,
            "avg_luteal_days": 0.0,
            "avg_cycle_length": 0.0,
        }
    stats = await get_cycle_stats(user_id)
    avg_cycle_length = float(stats["avg_duration"]) if stats["avg_duration"] else 0.0
    bleeding_days = await get_bleeding_days_per_cycle(user_id)
    avg_bleeding = round(sum(bleeding_days) / len(bleeding_days), 1) if bleeding_days else 5.0
    if avg_cycle_length > 0:
        scale = avg_cycle_length / 28.0
    else:
        scale = 1.0
    return {
        "avg_menstruation_days": avg_bleeding,
        "avg_follicular_days": round(9.0 * scale, 1),
        "avg_ovulation_days": 3.0,
        "avg_luteal_days": round(14.0 * scale, 1),
        "avg_cycle_length": avg_cycle_length,
    }
