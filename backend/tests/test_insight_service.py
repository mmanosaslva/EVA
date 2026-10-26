from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import insert

from app.services.insight_service import (
    DISCLAIMER,
    build_cycle_context,
    create_insight,
    get_history,
    rules_insight,
    sanitize_question,
)
from app.services.llm_service import LlmResult
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


class TestSanitizeQuestion:
    def test_removes_email(self):
        assert "@" not in sanitize_question("escribeme a ana.perez@gmail.com por favor")

    def test_removes_uuid(self):
        q = f"mi id es {TEST_USER_ID}"
        assert TEST_USER_ID not in sanitize_question(q)

    def test_removes_phone(self):
        assert "300 123 4567" not in sanitize_question("llamame al 300 123 4567")

    def test_keeps_normal_question(self):
        q = "¿Es normal tener ciclos de 35 dias y colicos fuertes?"
        assert sanitize_question(q) == q


class TestRulesInsight:
    @pytest.mark.parametrize("phase", ["menstruacion", "folicular", "ovulacion", "lutea"])
    def test_each_phase_has_tip_and_disclaimer(self, phase):
        text = rules_insight({"fase_actual": phase, "sintomas_frecuentes": [], "dias_hasta_siguiente": 5})
        assert DISCLAIMER in text
        assert "podria llegar en unos 5 dias" in text

    def test_without_phase(self):
        text = rules_insight({"fase_actual": None, "sintomas_frecuentes": []})
        assert "Registra tu periodo" in text
        assert DISCLAIMER in text

    def test_includes_frequent_symptoms(self):
        text = rules_insight({"fase_actual": "lutea", "sintomas_frecuentes": ["fatiga", "colicos"]})
        assert "fatiga, colicos" in text


class TestCreateInsight:
    @patch("app.services.insight_service.insight_repo.save_insight", new_callable=AsyncMock)
    @patch("app.services.insight_service.llm_service.generate", new_callable=AsyncMock)
    async def test_llm_answer_is_not_automatic(self, mock_generate, mock_save):
        mock_generate.return_value = LlmResult(text="respuesta IA", provider="groq")
        result = await create_insight(TEST_USER_ID, "¿Por que tengo colicos?")
        assert result == {
            "insight": "respuesta IA",
            "phase": None,
            "disclaimer": DISCLAIMER,
            "is_automatic": False,
        }
        assert mock_save.await_args.kwargs["source"] == "groq"

    @patch("app.services.insight_service.insight_repo.save_insight", new_callable=AsyncMock)
    @patch("app.services.insight_service.llm_service.generate", new_callable=AsyncMock)
    async def test_same_shape_for_any_provider(self, mock_generate, mock_save):
        mock_generate.return_value = LlmResult(text="a", provider="groq")
        groq = await create_insight(TEST_USER_ID, "hola")
        mock_generate.return_value = LlmResult(text="a", provider="cloudflare")
        cloudflare = await create_insight(TEST_USER_ID, "hola")
        assert groq == cloudflare
        assert "groq" not in str(groq) and "cloudflare" not in str(cloudflare)

    @patch("app.services.insight_service.insight_repo.save_insight", new_callable=AsyncMock)
    @patch("app.services.insight_service.llm_service.generate", new_callable=AsyncMock)
    async def test_no_llm_uses_rules(self, mock_generate, mock_save):
        mock_generate.return_value = None
        result = await create_insight(TEST_USER_ID, "hola")
        assert result["is_automatic"] is True
        assert DISCLAIMER in result["insight"]
        assert mock_save.await_args.kwargs["source"] == "rules"

    @patch("app.services.insight_service.insight_repo.save_insight", new_callable=AsyncMock)
    @patch("app.services.insight_service.llm_service.generate", new_callable=AsyncMock)
    async def test_prompt_is_sanitized(self, mock_generate, mock_save):
        mock_generate.return_value = None
        await create_insight(TEST_USER_ID, f"soy ana@correo.com, id {TEST_USER_ID}")
        prompt = mock_generate.await_args.args[0]
        assert "ana@correo.com" not in prompt
        assert TEST_USER_ID not in prompt


class TestHistory:
    @patch("app.services.insight_service.insight_repo.get_insights_history", new_callable=AsyncMock)
    async def test_history_hides_provider(self, mock_history):
        from tests.conftest import MockRow
        base = {"question": "q", "insight": "i", "phase": None, "created_at": date(2026, 1, 1)}
        mock_history.return_value = (2, [
            MockRow({**base, "id": "1", "source": "groq"}),
            MockRow({**base, "id": "2", "source": "rules"}),
        ])
        total, items = await get_history(TEST_USER_ID)
        assert total == 2
        assert [i["is_automatic"] for i in items] == [False, True]
        assert all("source" not in i for i in items)


def test_response_models_have_no_provider_field():
    from app.models.insight import InsightHistoryItem, InsightResponse
    for model in (InsightResponse, InsightHistoryItem):
        assert "source" not in model.model_fields
        assert "is_automatic" in model.model_fields
