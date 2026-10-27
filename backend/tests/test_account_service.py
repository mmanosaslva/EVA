from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import func, insert, select

from app.services import account_service
from tests.conftest import SEED_SYMPTOMS
from tests.test_metadata import (
    auth_user_table,
    cycles_table,
    daily_logs_table,
    daily_symptoms_table,
    llm_insights_table,
    ml_models_table,
    symptoms_catalog_table,
    sync_operations_table,
    users_table,
)

ANA = "a0000000-0000-4000-8000-000000000001"
BEA = "b0000000-0000-4000-8000-000000000002"
EMAIL_ANA = "ana@eva.test"

USER_TABLES = {
    "user": (auth_user_table, auth_user_table.c.id),
    "users": (users_table, users_table.c.id),
    "cycles": (cycles_table, cycles_table.c.user_id),
    "ml_models": (ml_models_table, ml_models_table.c.user_id),
    "llm_insights": (llm_insights_table, llm_insights_table.c.user_id),
    "sync_operations": (sync_operations_table, sync_operations_table.c.user_id),
}


async def _seed_user(conn, user_id: str, email: str, n: int) -> None:
    """Crea una cuenta con datos en todas las tablas que dependen de ella."""
    cycle_id = f"{user_id[:8]}-c000-4000-8000-00000000000{n}"
    log_id = f"{user_id[:8]}-l000-4000-8000-00000000000{n}"
    await conn.execute(insert(auth_user_table).values(id=user_id, email=email, hashed_password="x"))
    await conn.execute(insert(users_table).values(id=user_id, email=email))
    await conn.execute(insert(cycles_table).values(id=cycle_id, user_id=user_id, start_date=date(2026, 9, 1)))
    await conn.execute(insert(daily_logs_table).values(id=log_id, cycle_id=cycle_id, date=date(2026, 9, 2), flow_level="medium"))
    await conn.execute(insert(daily_symptoms_table).values(log_id=log_id, symptom_id=1, intensity=3))
    await conn.execute(insert(ml_models_table).values(user_id=user_id, model_path=f"user_{user_id}.pkl"))
    await conn.execute(insert(llm_insights_table).values(user_id=user_id, question="q", insight="i", source="groq"))
    await conn.execute(insert(sync_operations_table).values(user_id=user_id, client_id=f"c-{n}", type="create_cycle", payload="{}"))


@pytest.fixture
async def two_users(sqlite_engine):
    async with sqlite_engine.begin() as conn:
        await conn.execute(insert(symptoms_catalog_table).values(SEED_SYMPTOMS))
        await _seed_user(conn, ANA, EMAIL_ANA, 1)
        await _seed_user(conn, BEA, "bea@eva.test", 2)
    return sqlite_engine


async def _counts(engine, user_id: str) -> dict[str, int]:
    async with engine.connect() as conn:
        counts = {}
        for name, (table, column) in USER_TABLES.items():
            counts[name] = (await conn.execute(select(func.count()).select_from(table).where(column == user_id))).scalar()
        user_logs = select(daily_logs_table.c.id).where(
            daily_logs_table.c.cycle_id.in_(select(cycles_table.c.id).where(cycles_table.c.user_id == user_id))
        )
        counts["daily_logs"] = (await conn.execute(select(func.count()).select_from(user_logs.subquery()))).scalar()
        counts["daily_symptoms"] = (await conn.execute(
            select(func.count()).select_from(daily_symptoms_table).where(daily_symptoms_table.c.log_id.like(f"{user_id[:8]}-%"))
        )).scalar()
        return counts


class TestDeleteAccount:
    async def test_deletes_every_row_of_the_user(self, two_users):
        before = await _counts(two_users, ANA)
        assert all(n == 1 for n in before.values()), before

        await account_service.delete_account(ANA)

        after = await _counts(two_users, ANA)
        assert all(n == 0 for n in after.values()), after

    async def test_other_users_are_untouched(self, two_users):
        await account_service.delete_account(ANA)
        bea = await _counts(two_users, BEA)
        assert all(n == 1 for n in bea.values()), bea

    async def test_unknown_user_returns_404_and_deletes_nothing(self, two_users):
        with pytest.raises(HTTPException) as exc:
            await account_service.delete_account("c0000000-0000-4000-8000-000000000099")
        assert exc.value.status_code == 404
        assert all(n == 1 for n in (await _counts(two_users, ANA)).values())

    async def test_reregister_with_same_email_sees_no_old_data(self, two_users):
        await account_service.delete_account(ANA)
        new_id = "a1111111-0000-4000-8000-000000000003"
        async with two_users.begin() as conn:
            await conn.execute(insert(auth_user_table).values(id=new_id, email=EMAIL_ANA, hashed_password="y"))
            await conn.execute(insert(users_table).values(id=new_id, email=EMAIL_ANA))
        counts = await _counts(two_users, new_id)
        assert counts["cycles"] == 0
        assert counts["llm_insights"] == 0
        assert counts["ml_models"] == 0
