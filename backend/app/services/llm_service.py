"""Llamadas a los proveedores de LLM (Groq y Cloudflare Workers AI) con failover.

Este módulo solo habla HTTP con los proveedores. No accede a la BD:
el contexto del ciclo, el respaldo por reglas y el guardado viven en
insight_service.py (Docs/s10/reglas.md RG-07, restricciones.md RX-06).
"""

import logging
import time
from dataclasses import dataclass
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions"

TEMPERATURE = 0.5

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


@dataclass
class LlmResult:
    text: str
    provider: str


class ProviderError(Exception):
    """Fallo de un proveedor. `cooldown` indica si hay que dejarlo descansar."""

    def __init__(self, reason: str, cooldown: bool = False, retry_after: Optional[float] = None):
        super().__init__(reason)
        self.reason = reason
        self.cooldown = cooldown
        self.retry_after = retry_after


# Proveedor -> instante (time.monotonic) hasta el que no se intenta.
# En serverless vive solo mientras la instancia esté caliente; es suficiente.
_cooldown_until: dict[str, float] = {}


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


def _messages(prompt: str) -> list[dict]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]


def _groq_request(prompt: str) -> Optional[tuple[str, dict, dict]]:
    if not settings.GROQ_API_KEY:
        return None
    body = {
        "model": settings.GROQ_MODEL,
        "messages": _messages(prompt),
        "temperature": TEMPERATURE,
        "max_completion_tokens": settings.LLM_MAX_TOKENS,
        # gpt-oss razona antes de responder: esfuerzo bajo y sin devolver el razonamiento
        "reasoning_effort": "low",
        "include_reasoning": False,
    }
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    return GROQ_API_URL, headers, body


def _cloudflare_request(prompt: str) -> Optional[tuple[str, dict, dict]]:
    if not (settings.CLOUDFLARE_ACCOUNT_ID and settings.CLOUDFLARE_API_TOKEN):
        return None
    body = {
        "model": settings.CLOUDFLARE_AI_MODEL,
        "messages": _messages(prompt),
        "temperature": TEMPERATURE,
        "max_tokens": settings.LLM_MAX_TOKENS,
    }
    headers = {"Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}"}
    url = CLOUDFLARE_API_URL.format(account_id=settings.CLOUDFLARE_ACCOUNT_ID)
    return url, headers, body


_PROVIDERS = {
    "groq": _groq_request,
    "cloudflare": _cloudflare_request,
}


def _extract_text(data: dict) -> str:
    # Formato OpenAI (Groq y el endpoint compatible de Cloudflare)
    choices = data.get("choices") or []
    if choices:
        content = (choices[0].get("message") or {}).get("content")
        if content:
            return content.strip()
    # Formato nativo de Workers AI, por si el endpoint compatible responde así
    result = data.get("result")
    if isinstance(result, dict) and isinstance(result.get("response"), str):
        return result["response"].strip()
    return ""


def _parse_retry_after(response: httpx.Response) -> Optional[float]:
    value = response.headers.get("retry-after")
    try:
        return float(value) if value else None
    except ValueError:
        return None


async def _call_provider(name: str, prompt: str) -> str:
    build = _PROVIDERS.get(name)
    if build is None:
        raise ProviderError("unknown_provider")
    request = build(prompt)
    if request is None:
        raise ProviderError("not_configured")
    url, headers, body = request

    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=headers, json=body)
    except httpx.TimeoutException:
        raise ProviderError("timeout")
    except httpx.HTTPError:
        raise ProviderError("network_error", cooldown=True)

    if response.status_code == 429:
        raise ProviderError("rate_limited", cooldown=True, retry_after=_parse_retry_after(response))
    if response.status_code >= 400:
        # 5xx: caída del proveedor. 400/404: modelo retirado o parámetro inválido,
        # que no se arregla solo. En ambos casos conviene dejarlo descansar.
        raise ProviderError(f"http_{response.status_code}", cooldown=True)

    try:
        text = _extract_text(response.json())
    except ValueError:
        raise ProviderError("invalid_json")
    if not text:
        raise ProviderError("empty_response")
    return text


def _in_cooldown(name: str) -> bool:
    return _cooldown_until.get(name, 0.0) > time.monotonic()


def _start_cooldown(name: str, retry_after: Optional[float]) -> None:
    seconds = retry_after if retry_after else settings.LLM_PROVIDER_COOLDOWN_SECONDS
    _cooldown_until[name] = time.monotonic() + seconds


async def generate(prompt: str) -> Optional[LlmResult]:
    """Prueba los proveedores en orden y devuelve la primera respuesta válida.

    Devuelve None si ninguno responde; el llamador decide el respaldo.
    """
    for name in settings.llm_providers_list:
        if _in_cooldown(name):
            continue
        try:
            text = await _call_provider(name, prompt)
        except ProviderError as exc:
            # Solo proveedor y motivo: nunca el prompt ni la respuesta (RX-05)
            logger.warning("llm provider failed: provider=%s reason=%s", name, exc.reason)
            if exc.cooldown:
                _start_cooldown(name, exc.retry_after)
            continue
        _cooldown_until.pop(name, None)
        return LlmResult(text=text, provider=name)
    return None
