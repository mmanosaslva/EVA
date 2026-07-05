import logging
from datetime import date, timedelta
from typing import Optional

import httpx

from app.core.config import settings
from app.repositories import analytics_repo, cycle_repo, daily_log_repo, symptom_repo
from app.utils.cycle_utils import calculate_current_phase

OLLAMA_BASE_URL = settings.OLLAMA_BASE_URL
OLLAMA_MODEL = "mistral"

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-8b-8192"

SYSTEM_PROMPT = """
Eres EVA, una asistente de salud menstrual. Respondes en espanol, con tono calido,
empatico y basado en evidencia cientifica.

Reglas de formato:
- Maximo 4 oraciones por respuesta.
- Siempre incluye: "EVA no reemplaza el consejo medico profesional."
- Usa los datos del ciclo proporcionados para personalizar la respuesta.
- Si te preguntan por algo no relacionado con salud menstrual, redirige amablemente.

Limites:
- Nunca hagas diagnosticos medicos.
- Si la usuaria menciona sintomas graves (dolor intenso, sangrado abundante,
  fiebre, etc.), recomienda consultar a un ginecologo.
- No inventes datos medicos. Si no sabes, di que no tienes suficiente informacion.
"""


def build_context_prompt(cycle_context: dict, question: str) -> str:
    sintomas = ", ".join(cycle_context.get("sintomas_frecuentes", []))
    return f"""
Contexto del ciclo actual:
- Fase: {cycle_context.get('fase_actual', 'desconocida')}
- Dia del ciclo: {cycle_context.get('dia_del_ciclo', '?')}
- Duracion promedio de sus ciclos: {cycle_context.get('duracion_promedio', 28)} dias
- Sintomas mas frecuentes: {sintomas if sintomas else 'ninguno registrado'}
- Intensidad de sintomas actual: {cycle_context.get('intensidad_actual', 'moderada')}
- Dias hasta el proximo periodo: {cycle_context.get('dias_hasta_siguiente', '?')}

Pregunta: {question}
"""


async def _call_ollama(prompt: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{SYSTEM_PROMPT}\n\n{prompt}",
                    "stream": False,
                    "keep_alive": "30m",
                    "options": {"temperature": 0.5, "num_predict": 300},
                },
            )
            response.raise_for_status()
            return response.json()["response"].strip()
    except Exception:
        return None


async def _call_groq(prompt: str) -> Optional[str]:
    if not settings.GROQ_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 300,
                    "temperature": 0.5,
                },
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


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


logger = logging.getLogger(__name__)


OLLAMA_TIMEOUT = 10.0


async def check_ollama_health() -> dict:
    """Verifica si Ollama esta disponible y que modelos tiene cargados.

    Retorna dict con status, models y message.
    No lanza excepcion — siempre retorna un dict descriptivo.
    """
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m["name"] for m in data.get("models", [])]
                has_mistral = any("mistral" in m for m in models)
                return {
                    "status": "ok" if has_mistral else "no_model",
                    "models": models,
                    "message": (
                        f"Ollama disponible. Modelos: {models}"
                        if has_mistral
                        else f"Ollama disponible pero modelo mistral no encontrado. Modelos: {models}"
                    ),
                }
            return {
                "status": "error",
                "models": [],
                "message": f"Ollama respondio con status {response.status_code}",
            }
    except httpx.ConnectError:
        return {
            "status": "unavailable",
            "models": [],
            "message": "Ollama no esta corriendo. Ejecuta: ollama serve",
        }
    except Exception as e:
        return {
            "status": "error",
            "models": [],
            "message": f"Error verificando Ollama: {e}",
        }


async def get_insight(question: str, cycle_context: dict) -> dict:
    prompt = build_context_prompt(cycle_context, question)

    ollama_response = await _call_ollama(prompt)
    if ollama_response:
        return {
            "insight": ollama_response,
            "source": f"ollama/{OLLAMA_MODEL}",
            "disclaimer": "EVA no reemplaza el consejo medico profesional.",
        }

    groq_response = await _call_groq(prompt)
    if groq_response:
        return {
            "insight": groq_response,
            "source": f"groq/{GROQ_MODEL}",
            "disclaimer": "EVA no reemplaza el consejo medico profesional.",
        }

    raise RuntimeError(
        "LLM service unavailable. Ollama (http://localhost:11434) must be running "
        "with the 'mistral' model loaded. Run: ollama serve && ollama pull mistral. "
        "If Ollama is not available, set GROQ_API_KEY in .env as fallback."
    )
