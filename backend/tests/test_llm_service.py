from datetime import date, timedelta

import pytest
from sqlalchemy import insert

from app.services.llm_service import build_cycle_context, build_context_prompt
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
