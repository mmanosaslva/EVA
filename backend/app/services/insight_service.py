"""Orquesta el chatbot: contexto del ciclo, llamada al LLM, respaldo por reglas y guardado.

El frontend nunca recibe el nombre del proveedor ni del modelo (RX-06): solo
`is_automatic`, que es True cuando ningún LLM respondió y se usó el respaldo por reglas.
"""

import re
from datetime import date, timedelta

from app.repositories import analytics_repo, cycle_repo, daily_log_repo, insight_repo, symptom_repo
from app.services import llm_service
from app.utils.cycle_utils import calculate_current_phase

DISCLAIMER = "EVA no reemplaza el consejo medico profesional."
RULES_SOURCE = "rules"

_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
_UUID_RE = re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b")
_PHONE_RE = re.compile(r"\+?\d[\d\s().-]{6,}\d")

_PHASE_TIPS = {
    "menstruacion": (
        "Estas en tu fase menstrual. Descansar, hidratarte y aplicar calor suave en el abdomen "
        "puede aliviar los colicos."
    ),
    "folicular": (
        "Estas en tu fase folicular. Muchas personas sienten mas energia en estos dias; "
        "es un buen momento para retomar la actividad fisica."
    ),
    "ovulacion": (
        "Estas cerca de tu ovulacion. Es normal notar cambios en el flujo y, a veces, "
        "una molestia leve en un costado del abdomen."
    ),
    "lutea": (
        "Estas en tu fase lutea. Puedes notar hinchazon, sensibilidad o cambios de animo; "
        "dormir bien y reducir la sal y la cafeina suele ayudar."
    ),
}
_NO_PHASE_TIP = (
    "Todavia no tengo suficientes datos de tu ciclo. Registra tu periodo y tus sintomas "
    "para que pueda darte orientacion personalizada."
)


def sanitize_question(question: str) -> str:
    """Quita datos que identifiquen a la usuaria antes de enviar la pregunta (RX-06)."""
    text = _EMAIL_RE.sub("[email]", question)
    text = _UUID_RE.sub("[id]", text)
    text = _PHONE_RE.sub("[numero]", text)
    return text


def rules_insight(cycle_context: dict) -> str:
    """Respuesta sin LLM, armada con la fase y los sintomas frecuentes."""
    parts = [_PHASE_TIPS.get(cycle_context.get("fase_actual"), _NO_PHASE_TIP)]
    sintomas = cycle_context.get("sintomas_frecuentes") or []
    if sintomas:
        parts.append(f"Tus sintomas mas frecuentes son: {', '.join(sintomas[:3])}.")
    dias = cycle_context.get("dias_hasta_siguiente")
    if isinstance(dias, int) and dias > 0 and cycle_context.get("fase_actual"):
        parts.append(f"Estimamos que tu proximo periodo podria llegar en unos {dias} dias.")
    parts.append(
        "Si el dolor es intenso, el sangrado muy abundante o tienes fiebre, consulta a tu ginecologa/o."
    )
    parts.append(DISCLAIMER)
    return " ".join(parts)


async def build_cycle_context(user_id: str, context_cycles: int = 6) -> dict:
    rows = await cycle_repo.get_cycles_by_user(user_id, limit=context_cycles, offset=0)

    if not rows:
        return {
            "fase_actual": None,
            "dia_del_ciclo": None,
            "duracion_promedio": 28,
            "sintomas_frecuentes": [],
            "intensidad_actual": None,
            "dias_hasta_siguiente": None,
        }

    cycles = [dict(row._mapping) for row in rows]
    cycles.sort(key=lambda c: c["start_date"])

    last_cycle = cycles[-1]
    last_cycle_dict = {
        "start_date": last_cycle["start_date"],
        "end_date": last_cycle.get("end_date"),
    }

    phase, phase_day = calculate_current_phase(last_cycle_dict)

    if len(cycles) == 1:
        avg_duration = 28.0
    else:
        durations = [
            (cycles[i]["start_date"] - cycles[i - 1]["start_date"]).days
            for i in range(1, len(cycles))
        ]
        avg_duration = round(sum(durations) / len(durations), 1)

    predicted_next = last_cycle["start_date"] + timedelta(days=int(round(avg_duration)))
    days_until_next = (predicted_next - date.today()).days if predicted_next > date.today() else 0

    # ── Síntomas frecuentes desde la BD ───────────────────────────
    cycle_ids = [c["id"] for c in cycles]
    symptom_rows = await analytics_repo.get_symptom_frequencies(cycle_ids, limit=5)

    sintomas_frecuentes = []
    intensidad_actual = None
    if symptom_rows:
        sintomas_frecuentes = [s["name"] for s in symptom_rows]
        intensidad_actual = str(symptom_rows[0]["avg_intensity"])

    # ── Intensidad del día de hoy desde daily_logs ────────────────
    today = date.today()
    log = await daily_log_repo.get_daily_log_by_date(last_cycle["id"], today)
    if log:
        log_id = str(log._mapping["id"])
        today_symptoms = await symptom_repo.get_symptoms_by_log(log_id)
        if today_symptoms:
            intensities = [s["intensity"] for s in today_symptoms]
            avg_today = round(sum(intensities) / len(intensities), 1)
            intensidad_actual = str(avg_today)

    return {
        "fase_actual": phase,
        "dia_del_ciclo": phase_day,
        "duracion_promedio": avg_duration,
        "sintomas_frecuentes": sintomas_frecuentes,
        "intensidad_actual": intensidad_actual or "moderada",
        "dias_hasta_siguiente": days_until_next,
    }


async def create_insight(user_id: str, question: str, context_cycles: int = 3) -> dict:
    cycle_context = await build_cycle_context(user_id=user_id, context_cycles=context_cycles)
    prompt = llm_service.build_context_prompt(cycle_context, sanitize_question(question))

    result = await llm_service.generate(prompt)
    if result is not None:
        insight, source = result.text, result.provider
    else:
        insight, source = rules_insight(cycle_context), RULES_SOURCE

    phase = cycle_context.get("fase_actual")
    await insight_repo.save_insight(
        user_id=user_id,
        question=question,
        insight=insight,
        phase=phase,
        source=source,
    )
    return {
        "insight": insight,
        "phase": phase,
        "disclaimer": DISCLAIMER,
        "is_automatic": source == RULES_SOURCE,
    }


async def get_history(user_id: str, limit: int = 20, offset: int = 0) -> tuple[int, list[dict]]:
    total, rows = await insight_repo.get_insights_history(user_id=user_id, limit=limit, offset=offset)
    items = []
    for row in rows:
        data = dict(row._mapping)
        items.append({
            "id": str(data["id"]),
            "question": data["question"],
            "insight": data["insight"],
            "phase": data.get("phase"),
            "is_automatic": data["source"] == RULES_SOURCE,
            "created_at": data["created_at"],
        })
    return total, items
