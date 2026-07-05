"""Tests de integración para _call_ollama() con Ollama real.

Requiere Ollama corriendo con el modelo mistral cargado.
Si Ollama no está disponible, los tests se saltan automáticamente.
"""

import httpx
import pytest

from app.services.llm_service import _call_ollama, get_insight

OLLAMA_BASE_URL = "http://localhost:11434"


def ollama_available() -> bool:
    try:
        response = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            models = [m["name"] for m in data.get("models", [])]
            return any("mistral" in m for m in models)
        return False
    except Exception:
        return False


ollama_ready = ollama_available()


def reason():
    return "Ollama no está disponible o mistral no está cargado"


@pytest.mark.skipif(not ollama_ready, reason=reason())
class TestOllamaIntegration:

    async def test_call_ollama_returns_string(self):
        result = await _call_ollama("Responde solo: OK")
        assert result is not None
        assert isinstance(result, str)
        assert len(result) > 0

    async def test_call_ollama_responde_en_espanol(self):
        result = await _call_ollama("Responde solo con la palabra: HOLA")
        assert result is not None
        assert "HOLA" in result.upper()

    async def test_get_insight_returns_expected_structure(self):
        ctx = {
            "fase_actual": "lutea",
            "dia_del_ciclo": 22,
            "duracion_promedio": 28,
            "sintomas_frecuentes": ["fatiga", "irritabilidad"],
            "intensidad_actual": "3.5",
            "dias_hasta_siguiente": 5,
        }
        result = await get_insight("¿Qué síntomas son normales en la fase lútea?", ctx)
        assert result["source"].startswith("ollama/")
        assert "insight" in result
        assert len(result["insight"]) > 0
        assert "reemplaza" in result["disclaimer"]

    async def test_insight_source_is_ollama_mistral(self):
        ctx = {
            "fase_actual": "folicular",
            "dia_del_ciclo": 8,
            "duracion_promedio": 28,
            "sintomas_frecuentes": [],
            "intensidad_actual": None,
            "dias_hasta_siguiente": 18,
        }
        result = await get_insight("¿Qué es la fase folicular?", ctx)
        assert result["source"] == "ollama/mistral"

    async def test_insight_response_time_under_30s(self):
        import time
        ctx = {
            "fase_actual": "menstruacion",
            "dia_del_ciclo": 2,
            "duracion_promedio": 28,
            "sintomas_frecuentes": ["dolor abdominal"],
            "intensidad_actual": "4.0",
            "dias_hasta_siguiente": 24,
        }
        start = time.time()
        await get_insight("¿Cómo aliviar los cólicos menstruales?", ctx)
        elapsed = time.time() - start
        assert elapsed < 30.0, f"Tiempo de respuesta {elapsed:.2f}s excede 30s"

    async def test_insight_menstrual_health_related(self):
        ctx = {
            "fase_actual": "ovulacion",
            "dia_del_ciclo": 14,
            "duracion_promedio": 28,
            "sintomas_frecuentes": [],
            "intensidad_actual": None,
            "dias_hasta_siguiente": 14,
        }
        result = await get_insight("¿Cuándo soy más fértil?", ctx)
        assert result is not None
        assert len(result["insight"]) > 20

    async def test_five_different_spanish_questions(self):
        preguntas = [
            "¿Por qué tengo dolor abdominal antes de mi periodo?",
            "¿Es normal tener ciclos de 35 días?",
            "¿Qué significa tener flujo marrón al final de la regla?",
            "¿Cómo puedo aliviar los cólicos menstruales?",
            "¿Cuánto dura la ventana fértil?",
        ]
        ctx_base = {
            "fase_actual": "lutea",
            "dia_del_ciclo": 22,
            "duracion_promedio": 28,
            "sintomas_frecuentes": ["fatiga"],
            "intensidad_actual": "3.0",
            "dias_hasta_siguiente": 5,
        }
        for pregunta in preguntas:
            result = await get_insight(pregunta, ctx_base)
            assert result is not None
            assert result["source"].startswith("ollama/")
            assert len(result["insight"]) > 10
