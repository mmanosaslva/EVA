from sqlalchemy import insert, update, select

from app.core.db import engine
from app.models.db_tables import ml_models_table

ML_COLUMNS = [
    ml_models_table.c.id,
    ml_models_table.c.user_id,
    ml_models_table.c.model_path,
    ml_models_table.c.mae,
    ml_models_table.c.cycles_used,
    ml_models_table.c.trained_at,
    ml_models_table.c.is_active,
]


async def upsert_ml_model(user_id: str, model_info: dict) -> dict:
    existing = await get_ml_model(user_id)
    if existing:
        query = (
            update(ml_models_table)
            .where(ml_models_table.c.user_id == user_id)
            .values(
                model_path=model_info["model_path"],
                mae=model_info.get("mae"),
                cycles_used=model_info.get("cycles_used"),
                is_active=True,
            )
            .returning(*ML_COLUMNS)
        )
    else:
        query = (
            insert(ml_models_table)
            .values(
                user_id=user_id,
                model_path=model_info["model_path"],
                mae=model_info.get("mae"),
                cycles_used=model_info.get("cycles_used"),
            )
            .returning(*ML_COLUMNS)
        )

    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        row = result.one()
        return dict(row._mapping)


async def get_ml_model(user_id: str):
    query = select(*ML_COLUMNS).where(ml_models_table.c.user_id == user_id)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.one_or_none()
