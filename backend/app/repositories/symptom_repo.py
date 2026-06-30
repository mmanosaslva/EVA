from sqlalchemy import select, insert, delete
from app.core.db import engine
from app.models.db_tables import symptoms_catalog_table, daily_symptoms_table

CATALOG_COLUMNS = [
    symptoms_catalog_table.c.id,
    symptoms_catalog_table.c.name,
    symptoms_catalog_table.c.category,
    symptoms_catalog_table.c.common_phase,
]

DAILY_SYMPTOM_COLUMNS = [
    daily_symptoms_table.c.log_id,
    daily_symptoms_table.c.symptom_id,
    daily_symptoms_table.c.intensity,
]


async def get_all_symptoms() -> list:
    query = select(*CATALOG_COLUMNS).order_by(symptoms_catalog_table.c.category, symptoms_catalog_table.c.name)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.fetchall()


async def get_symptom_by_id(symptom_id: int):
    query = select(*CATALOG_COLUMNS).where(symptoms_catalog_table.c.id == symptom_id)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.one_or_none()


async def get_symptoms_by_log(log_id: str) -> list:
    join_cols = [
        daily_symptoms_table.c.symptom_id,
        daily_symptoms_table.c.intensity,
        symptoms_catalog_table.c.name,
        symptoms_catalog_table.c.category,
        symptoms_catalog_table.c.common_phase,
    ]
    query = (
        select(*join_cols)
        .select_from(daily_symptoms_table.join(symptoms_catalog_table))
        .where(daily_symptoms_table.c.log_id == log_id)
        .order_by(symptoms_catalog_table.c.category, symptoms_catalog_table.c.name)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.fetchall()


async def add_symptoms_to_log(log_id: str, symptoms: list[dict]) -> list:
    rows = [
        {"log_id": log_id, "symptom_id": s["symptom_id"], "intensity": s["intensity"]}
        for s in symptoms
    ]
    query = insert(daily_symptoms_table).values(rows).returning(*DAILY_SYMPTOM_COLUMNS)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        return result.fetchall()


async def remove_symptoms_from_log(log_id: str, symptom_ids: list[int]) -> bool:
    query = delete(daily_symptoms_table).where(
        daily_symptoms_table.c.log_id == log_id,
        daily_symptoms_table.c.symptom_id.in_(symptom_ids),
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        return result.rowcount > 0


async def remove_all_symptoms_from_log(log_id: str) -> bool:
    query = delete(daily_symptoms_table).where(daily_symptoms_table.c.log_id == log_id)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        return result.rowcount > 0
