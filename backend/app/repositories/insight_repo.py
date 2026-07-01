from typing import Optional

from sqlalchemy import insert, select, func

from app.core.db import engine
from app.models.db_tables import llm_insights_table

INSIGHT_COLUMNS = [
    llm_insights_table.c.id,
    llm_insights_table.c.user_id,
    llm_insights_table.c.question,
    llm_insights_table.c.insight,
    llm_insights_table.c.phase,
    llm_insights_table.c.source,
    llm_insights_table.c.created_at,
]


async def save_insight(
    user_id: str,
    question: str,
    insight: str,
    phase: Optional[str],
    source: str,
) -> dict:
    query = (
        insert(llm_insights_table)
        .values(
            user_id=user_id,
            question=question,
            insight=insight,
            phase=phase,
            source=source,
        )
        .returning(*INSIGHT_COLUMNS)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        row = result.one()
        return dict(row._mapping)


async def get_insights_history(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
) -> tuple[int, list]:
    count_query = (
        select(func.count())
        .select_from(llm_insights_table)
        .where(llm_insights_table.c.user_id == user_id)
    )
    select_query = (
        select(*INSIGHT_COLUMNS)
        .where(llm_insights_table.c.user_id == user_id)
        .order_by(llm_insights_table.c.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    async with engine.connect() as conn:
        total = await conn.execute(count_query)
        total_count = total.scalar_one()
        rows = await conn.execute(select_query)
        return total_count, rows.fetchall()
