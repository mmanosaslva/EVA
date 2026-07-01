from datetime import date, timedelta
from typing import Optional

import httpx

from app.core.config import settings
from app.repositories import cycle_repo
from app.utils.cycle_utils import calculate_current_phase

OLLAMA_BASE_URL = settings.OLLAMA_BASE_URL
OLLAMA_MODEL = "mistral"

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-8b-8192"

SYSTEM_PROMPT = """
Eres EVA, una asistente de salud menstrual. Respondes en espanol, con tono calido,
empatico y basado en evidencia cientifica. Tus respuestas son concisas (maximo 4 oraciones)
y siempre incluyen el disclaimer de que no reemplazas al medico.

Principios:
- Solo hablas de salud menstrual y temas relacionados
- Nunca haces diagnosticos medicos
- Si la usuaria menciona sintomas graves, la remites a su ginecologa
- Usas los datos del ciclo proporcionados para personalizar la respuesta
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
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{SYSTEM_PROMPT}\n\n{prompt}",
                    "stream": False,
                    "options": {"temperature": 0.7, "num_predict": 300},
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
                    "temperature": 0.7,
                },
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


async def build_cycle_context(user_id: str, context_cycles: int = 3) -> dict:
    rows = await cycle_repo.get_cycles_by_user(user_id, limit=context_cycles, offset=0)

    if not rows:
        return {
            "fase_actual": None,
            "dia_del_ciclo": None,
            "duracion_promedio": 28,
            "sintomas_frecuentes": [],
            "intensidad_actual": "moderada",
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

    return {
        "fase_actual": phase,
        "dia_del_ciclo": phase_day,
        "duracion_promedio": avg_duration,
        "sintomas_frecuentes": [],
        "intensidad_actual": "moderada",
        "dias_hasta_siguiente": days_until_next,
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

    raise RuntimeError("LLM service unavailable")
