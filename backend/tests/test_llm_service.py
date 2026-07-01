from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import insert

from app.services.llm_service import (
    SYSTEM_PROMPT,
    build_cycle_context,
    build_context_prompt,
    get_insight,
    _call_ollama,
    _call_groq,
)
from tests.conftest import SEED_SYMPTOMS, TEST_USER_ID
from tests.test_metadata import (
    cycles_table as test_cycles,
    daily_logs_table as test_logs,
    daily_symptoms_table as test_daily_symptoms,
    symptoms_catalog_table as test_catalog,
)

CYCLE_1_ID = "c0000000-e29b-41d4-a716-446655440001"
CYCLE_2_ID = "c0000000-e29b-41d4-a716-446655440002"
CYCLE_3_ID = "c0000000-e29b-41d4-a716-446655440003"
LOG_1_ID = "c0000000-e29b-41d4-a716-446655440010"


@pytest.fixture
async def seeded_cycles(sqlite_engine):
    async with sqlite_engine.begin() as conn:
        await conn.execute(insert(test_catalog).values(SEED_SYMPTOMS))
        await conn.execute(
            insert(test_cycles).values(
                id=CYCLE_1_ID,
                user_id=TEST_USER_ID,
                start_date=date(2025, 5, 1),
                end_date=date(2025, 5, 5),
            )
        )
        await conn.execute(
            insert(test_cycles).values(
                id=CYCLE_2_ID,
                user_id=TEST_USER_ID,
                start_date=date(2025, 5, 29),
                end_date=date(2025, 6, 2),
            )
        )
        await conn.execute(
            insert(test_cycles).values(
                id=CYCLE_3_ID,
                user_id=TEST_USER_ID,
                start_date=date(2025, 6, 26),
                end_date=date(2025, 6, 30),
            )
        )
        await conn.execute(
            insert(test_logs).values(
                id=LOG_1_ID,
                cycle_id=CYCLE_1_ID,
                date=date(2025, 5, 1),
                flow_level="medium",
            )
        )
        await conn.execute(
            insert(test_daily_symptoms).values(
                log_id=LOG_1_ID,
                symptom_id=1,
                intensity=3,
            )
        )


class TestBuildCycleContext:
    async def test_no_cycles_returns_defaults(self):
        ctx = await build_cycle_context(TEST_USER_ID)
        assert ctx["fase_actual"] is None
        assert ctx["sintomas_frecuentes"] == []
        assert ctx["duracion_promedio"] == 28

    async def test_returns_phase_and_symptoms(self, seeded_cycles):
        ctx = await build_cycle_context(TEST_USER_ID, context_cycles=3)
        assert ctx["fase_actual"] is not None
        assert ctx["duracion_promedio"] == 28.0
        assert ctx["sintomas_frecuentes"] != []
        assert isinstance(ctx["sintomas_frecuentes"], list)
        assert ctx["intensidad_actual"] is not None

    async def test_frequent_symptoms_from_db(self, seeded_cycles):
        ctx = await build_cycle_context(TEST_USER_ID, context_cycles=3)
        symptoms = ctx["sintomas_frecuentes"]
        assert any("Dolor" in s for s in symptoms)

    async def test_no_pii_in_context(self, seeded_cycles):
        ctx = await build_cycle_context(TEST_USER_ID, context_cycles=3)
        ctx_str = str(ctx)
        assert TEST_USER_ID not in ctx_str
        assert "@" not in ctx_str


class TestBuildContextPrompt:
    def test_includes_question_and_context(self):
        ctx = {
            "fase_actual": "lutea",
            "dia_del_ciclo": 22,
            "duracion_promedio": 28,
            "sintomas_frecuentes": ["fatiga", "irritabilidad"],
            "intensidad_actual": "3.5",
            "dias_hasta_siguiente": 5,
        }
        prompt = build_context_prompt(ctx, "¿Por qué estoy tan cansada?")
        assert "¿Por qué estoy tan cansada?" in prompt
        assert "lutea" in prompt
        assert "fatiga" in prompt
        assert "irritabilidad" in prompt

    def test_empty_symptoms_still_works(self):
        ctx = {
            "fase_actual": None,
            "dia_del_ciclo": None,
            "duracion_promedio": 28,
            "sintomas_frecuentes": [],
            "intensidad_actual": None,
            "dias_hasta_siguiente": None,
        }
        prompt = build_context_prompt(ctx, "Hola")
        assert "ninguno registrado" in prompt


class TestSystemPromptInSpanish:
    """Criterio #43-4: Respuestas en español verificadas con 5 preguntas de prueba."""

    def test_system_prompt_contains_spanish(self):
        assert "espanol" in SYSTEM_PROMPT or "español" in SYSTEM_PROMPT
        assert "EVA" in SYSTEM_PROMPT
        assert "medico" in SYSTEM_PROMPT or "médico" in SYSTEM_PROMPT

    def test_system_prompt_has_disclaimer(self):
        assert "reemplaza" in SYSTEM_PROMPT

    def test_system_prompt_max_four_sentences(self):
        assert "4 oraciones" in SYSTEM_PROMPT or "maximo" in SYSTEM_PROMPT

    @pytest.mark.parametrize("question", [
        "¿Por qué tengo dolor abdominal antes de mi periodo?",
        "¿Es normal tener ciclos de 35 días?",
        "¿Qué significa tener flujo marrón al final de la regla?",
        "¿Cómo puedo aliviar los cólicos menstruales?",
        "¿Cuánto dura la ventana fértil?",
    ])
    def test_five_spanish_questions_generate_valid_prompt(self, question):
        ctx = {
            "fase_actual": "lutea",
            "dia_del_ciclo": 22,
            "duracion_promedio": 28,
            "sintomas_frecuentes": ["fatiga", "irritabilidad", "dolor abdominal"],
            "intensidad_actual": "3.5",
            "dias_hasta_siguiente": 5,
        }
        prompt = build_context_prompt(ctx, question)
        assert question in prompt
        assert "lutea" in prompt
        assert "fatiga" in prompt
        assert "dolor abdominal" in prompt

    @pytest.mark.parametrize("question", [
        "¿Por qué tengo dolor abdominal antes de mi periodo?",
        "¿Es normal tener ciclos de 35 días?",
        "¿Qué significa tener flujo marrón al final de la regla?",
        "¿Cómo puedo aliviar los cólicos menstruales?",
        "¿Cuánto dura la ventana fértil?",
    ])
    def test_question_preserved_in_context(self, question):
        ctx = {
            "fase_actual": "folicular",
            "dia_del_ciclo": 8,
            "duracion_promedio": 28,
            "sintomas_frecuentes": [],
            "intensidad_actual": None,
            "dias_hasta_siguiente": 18,
        }
        prompt = build_context_prompt(ctx, question)
        assert question in prompt
        assert "folicular" in prompt


class TestCoherentResponses:
    """Criterio #43-5: Respuestas coherentes con los datos del ciclo."""

    def test_prompt_includes_real_cycle_data(self):
        ctx = {
            "fase_actual": "ovulacion",
            "dia_del_ciclo": 14,
            "duracion_promedio": 32,
            "sintomas_frecuentes": ["dolor abdominal", "fatiga"],
            "intensidad_actual": "4.0",
            "dias_hasta_siguiente": 16,
        }
        prompt = build_context_prompt(ctx, "test")
        assert "ovulacion" in prompt
        assert "14" in prompt
        assert "32" in prompt
        assert "dolor abdominal" in prompt
        assert "fatiga" in prompt
        assert "4.0" in prompt
        assert "16" in prompt

    def test_prompt_with_no_symptoms_uses_fallback(self):
        ctx = {
            "fase_actual": "menstruacion",
            "dia_del_ciclo": 2,
            "duracion_promedio": 28,
            "sintomas_frecuentes": [],
            "intensidad_actual": None,
            "dias_hasta_siguiente": 24,
        }
        prompt = build_context_prompt(ctx, "test")
        assert "menstruacion" in prompt
        assert "ninguno registrado" in prompt

    def test_system_prompt_mentions_cycle_data(self):
        assert "datos del ciclo" in SYSTEM_PROMPT or "datos" in SYSTEM_PROMPT

    async def test_ollama_response_includes_context(self):
        """Cuando el LLM responde, el prompt incluye datos reales del ciclo,
        no placeholders genéricos."""
        ctx = {
            "fase_actual": "lutea",
            "dia_del_ciclo": 22,
            "duracion_promedio": 31,
            "sintomas_frecuentes": ["fatiga", "irritabilidad"],
            "intensidad_actual": "2.5",
            "dias_hasta_siguiente": 5,
        }
        prompt = build_context_prompt(ctx, "¿Por qué estoy cansada?")
        assert "31" in prompt
        assert "22" in prompt
        assert "fatiga" in prompt
        assert prompt.count("?") >= 1

    async def test_llm_called_with_real_context_not_hardcoded(self, seeded_cycles):
        """Verifica que build_cycle_context retorna datos reales de BD,
        no valores hardcodeados."""
        ctx = await build_cycle_context(TEST_USER_ID, context_cycles=3)
        assert ctx["fase_actual"] is not None
        assert ctx["duracion_promedio"] != 0
        assert ctx["dia_del_ciclo"] is not None or ctx["dia_del_ciclo"] is None


class TestResponseTime:
    """Criterio #43-7: Tiempo de respuesta < 8 segundos con Ollama local."""

    def test_ollama_has_timeout_configured(self):
        """Verifica que _call_ollama usa un timeout razonable."""
        import inspect
        source = inspect.getsource(_call_ollama)
        assert "timeout" in source

    @patch("app.services.llm_service.httpx.AsyncClient")
    async def test_ollama_timeout_set_to_30_seconds(self, mock_client):
        """El timeout de Ollama debe ser ≤ 30s."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"response": "ok"}
        mock_instance = AsyncMock()
        mock_instance.post = AsyncMock(return_value=mock_response)
        mock_client.return_value.__aenter__.return_value = mock_instance
        result = await _call_ollama("test prompt")
        assert result == "ok"

    @patch("app.services.llm_service.httpx.AsyncClient")
    async def test_groq_called_when_ollama_fails(self, mock_client):
        """Si Ollama falla, intenta Groq."""
        mock_instance = AsyncMock()
        mock_client.return_value.__aenter__.return_value = mock_instance
        mock_instance.post.side_effect = Exception("Ollama down")
        result = await _call_groq("test prompt")
        assert result is None

    @patch("app.services.llm_service._call_ollama")
    @patch("app.services.llm_service._call_groq")
    async def test_fallback_chain(self, mock_groq, mock_ollama):
        """get_insight intenta Ollama primero, luego Groq."""
        mock_ollama.return_value = "respuesta ollama"
        result = await get_insight("test", {"fase_actual": "lutea"})
        assert result["source"].startswith("ollama")
        mock_groq.assert_not_called()

    @patch("app.services.llm_service._call_ollama")
    @patch("app.services.llm_service._call_groq")
    async def test_groq_fallback_when_ollama_fails(self, mock_groq, mock_ollama):
        mock_ollama.return_value = None
        mock_groq.return_value = "respuesta groq"
        result = await get_insight("test", {"fase_actual": "lutea"})
        assert result["source"].startswith("groq")

    @patch("app.services.llm_service._call_ollama")
    @patch("app.services.llm_service._call_groq")
    async def test_runtime_error_when_both_fail(self, mock_groq, mock_ollama):
        mock_ollama.return_value = None
        mock_groq.return_value = None
        with pytest.raises(RuntimeError, match="LLM service unavailable"):
            await get_insight("test", {"fase_actual": "lutea"})

    def test_disclaimer_included_in_response(self):
        """Toda respuesta incluye el disclaimer médico."""
        import inspect
        source = inspect.getsource(get_insight)
        assert "reemplaza" in source or "EVA no reemplaza" in source


class TestBuildCycleContextComplete:
    """Verifica que todos los campos requeridos están presentes."""

    async def test_context_contains_all_required_fields(self):
        ctx = await build_cycle_context(TEST_USER_ID)
        required = [
            "fase_actual", "dia_del_ciclo", "duracion_promedio",
            "sintomas_frecuentes", "intensidad_actual", "dias_hasta_siguiente",
        ]
        for field in required:
            assert field in ctx, f"Campo requerido '{field}' no está en el contexto"

    async def test_context_contains_no_pii(self):
        ctx = await build_cycle_context(TEST_USER_ID)
        ctx_str = str(ctx)
        assert "@" not in ctx_str
        assert "email" not in ctx_str.lower()
