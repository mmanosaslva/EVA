from sqlalchemy import select

from app.core.db import engine
from app.models.db_tables import daily_logs_table

LOG_COLUMNS = [
    daily_logs_table.c.id,
    daily_logs_table.c.cycle_id,
    daily_logs_table.c.date,
    daily_logs_table.c.flow_level,
    daily_logs_table.c.temperature,
    daily_logs_table.c.notes,
    daily_logs_table.c.created_at,
    daily_logs_table.c.updated_at,
]


async def get_logs_by_cycle(cycle_id: str) -> list:
    query = (
        select(*LOG_COLUMNS)
        .where(daily_logs_table.c.cycle_id == cycle_id)
        .order_by(daily_logs_table.c.date)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.fetchall()
