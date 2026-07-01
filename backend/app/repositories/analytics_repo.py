from sqlalchemy import select, func, case, cast, Integer, Numeric
from sqlalchemy.sql import text

from app.core.db import engine
from app.models.db_tables import (
    cycles_table,
    daily_logs_table,
    daily_symptoms_table,
    symptoms_catalog_table,
)


async def get_cycle_stats(user_id: str) -> dict | None:
    lead_start = func.lead(cycles_table.c.start_date).over(
        partition_by=cycles_table.c.user_id,
        order_by=cycles_table.c.start_date,
    )
    duration_expr = cast(lead_start - cycles_table.c.start_date, Integer).label("duration")
    subq = (
        select(cycles_table.c.start_date, duration_expr)
        .where(cycles_table.c.user_id == user_id)
    ).subquery("cycle_durations")

    query = select(
        func.count().label("total_cycles"),
        func.coalesce(func.round(func.avg(subq.c.duration).cast(Numeric), 1).cast(Numeric), 0).label("avg_duration"),
        func.coalesce(func.round(func.stddev_pop(subq.c.duration).cast(Numeric), 1).cast(Numeric), 0).label("variability"),
        func.min(subq.c.duration).label("shortest"),
        func.max(subq.c.duration).label("longest"),
        func.max(subq.c.start_date).label("last_start"),
    ).select_from(subq).where(subq.c.duration.isnot(None))

    async with engine.connect() as conn:
        result = await conn.execute(query)
        row = result.one()
        return dict(row._mapping)


async def get_cycle_count(user_id: str) -> int:
    query = select(func.count()).select_from(cycles_table).where(cycles_table.c.user_id == user_id)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.scalar_one()


async def get_bleeding_days_per_cycle(user_id: str) -> list[int]:
    query = (
        select(func.count().label("days"))
        .select_from(daily_logs_table.join(cycles_table, daily_logs_table.c.cycle_id == cycles_table.c.id))
        .where(cycles_table.c.user_id == user_id, daily_logs_table.c.flow_level.in_(["light", "medium", "heavy"]))
        .group_by(cycles_table.c.id)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return [r.days for r in result.fetchall()]


async def get_last_cycle_ids(user_id: str, limit: int) -> list[str]:
    query = (
        select(cycles_table.c.id)
        .where(cycles_table.c.user_id == user_id)
        .order_by(cycles_table.c.start_date.desc())
        .limit(limit)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return [str(r.id) for r in result.fetchall()]


async def get_all_cycle_ids(user_id: str) -> list[str]:
    query = (
        select(cycles_table.c.id)
        .where(cycles_table.c.user_id == user_id)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return [str(r.id) for r in result.fetchall()]


async def count_logs_for_cycles(cycle_ids: list[str]) -> int:
    if not cycle_ids:
        return 0
    query = (
        select(func.count(func.distinct(daily_logs_table.c.id)))
        .select_from(daily_logs_table)
        .where(daily_logs_table.c.cycle_id.in_(cycle_ids))
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.scalar_one()


async def get_symptom_frequencies(cycle_ids: list[str], limit: int) -> list[dict]:
    if not cycle_ids:
        return []
    query = (
        select(
            symptoms_catalog_table.c.id.label("symptom_id"),
            symptoms_catalog_table.c.name,
            symptoms_catalog_table.c.category,
            func.count(daily_symptoms_table.c.symptom_id).label("occurrences"),
            func.round(func.avg(cast(daily_symptoms_table.c.intensity, Numeric)), 2).label("avg_intensity"),
        )
        .select_from(
            daily_symptoms_table
            .join(daily_logs_table, daily_symptoms_table.c.log_id == daily_logs_table.c.id)
            .join(symptoms_catalog_table, daily_symptoms_table.c.symptom_id == symptoms_catalog_table.c.id)
        )
        .where(daily_logs_table.c.cycle_id.in_(cycle_ids))
        .group_by(symptoms_catalog_table.c.id, symptoms_catalog_table.c.name, symptoms_catalog_table.c.category)
        .order_by(func.count(daily_symptoms_table.c.symptom_id).desc())
        .limit(limit)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return [dict(r._mapping) for r in result.fetchall()]


async def get_flow_distribution(user_id: str) -> list[dict]:
    day_of_cycle = cast(daily_logs_table.c.date - cycles_table.c.start_date, Integer) + 1
    phase_expr = case(
        (day_of_cycle.between(1, 5), "menstruacion"),
        (day_of_cycle.between(6, 13), "folicular"),
        (day_of_cycle.between(14, 16), "ovulacion"),
        else_="lutea",
    ).label("phase")

    query = (
        select(
            phase_expr,
            func.coalesce(daily_logs_table.c.flow_level, "none").label("flow_level"),
            func.count().label("count"),
        )
        .select_from(daily_logs_table.join(cycles_table, daily_logs_table.c.cycle_id == cycles_table.c.id))
        .where(cycles_table.c.user_id == user_id)
        .group_by(text("phase"), daily_logs_table.c.flow_level)
        .order_by(text("phase"), daily_logs_table.c.flow_level)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return [dict(r._mapping) for r in result.fetchall()]


async def count_logs_for_user(user_id: str) -> int:
    query = (
        select(func.count())
        .select_from(daily_logs_table.join(cycles_table, daily_logs_table.c.cycle_id == cycles_table.c.id))
        .where(cycles_table.c.user_id == user_id)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.scalar_one()
