from datetime import date
from typing import Optional

from sqlalchemy import select, insert, update, delete, func, case, Numeric

from app.core.db import engine
from app.models.db_tables import cycles_table, daily_logs_table, daily_symptoms_table

CYCLE_COLUMNS = [
    cycles_table.c.id,
    cycles_table.c.user_id,
    cycles_table.c.start_date,
    cycles_table.c.end_date,
    cycles_table.c.created_at,
    cycles_table.c.updated_at,
]


async def get_cycles_by_user(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    from_date: Optional[date] = None,
) -> list:
    query = select(*CYCLE_COLUMNS).where(cycles_table.c.user_id == user_id)
    if from_date:
        query = query.where(cycles_table.c.start_date >= from_date)
    query = query.order_by(cycles_table.c.start_date.desc()).limit(limit).offset(offset)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.fetchall()


async def get_cycle_by_start_date(user_id: str, start_date: date):
    query = (
        select(*CYCLE_COLUMNS)
        .where(cycles_table.c.user_id == user_id)
        .where(cycles_table.c.start_date == start_date)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.one_or_none()


async def get_cycle_by_id(cycle_id: str, user_id: str):
    query = (
        select(*CYCLE_COLUMNS)
        .where(cycles_table.c.id == cycle_id)
        .where(cycles_table.c.user_id == user_id)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.one_or_none()


async def create_cycle(user_id: str, data: dict) -> dict:
    query = (
        insert(cycles_table)
        .values(**data, user_id=user_id)
        .returning(*CYCLE_COLUMNS)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        row = result.one()
        return dict(row._mapping)


async def update_cycle(cycle_id: str, user_id: str, data: dict) -> dict | None:
    query = (
        update(cycles_table)
        .where(cycles_table.c.id == cycle_id)
        .where(cycles_table.c.user_id == user_id)
        .values(**data)
        .returning(*CYCLE_COLUMNS)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        row = result.one_or_none()
        return dict(row._mapping) if row else None


async def delete_cycle(cycle_id: str, user_id: str) -> bool:
    query = (
        delete(cycles_table)
        .where(cycles_table.c.id == cycle_id)
        .where(cycles_table.c.user_id == user_id)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        return result.rowcount > 0


async def count_cycles(user_id: str) -> int:
    query = (
        select(func.count())
        .select_from(cycles_table)
        .where(cycles_table.c.user_id == user_id)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.scalar_one()


async def get_cycles_with_features(user_id: str) -> list[dict]:
    flow_expr = case(
        (daily_logs_table.c.flow_level == "heavy", 3),
        (daily_logs_table.c.flow_level == "medium", 2),
        (daily_logs_table.c.flow_level == "light", 1),
        else_=0,
    )

    symptom_count_subq = (
        select(
            daily_symptoms_table.c.log_id,
            func.count().label("symptom_count"),
        )
        .group_by(daily_symptoms_table.c.log_id)
    ).subquery("ds_count")

    symptom_count_expr = func.coalesce(
        func.avg(
            func.case(
                (
                    daily_logs_table.c.date - cycles_table.c.start_date >= 14,
                    symptom_count_subq.c.symptom_count,
                ),
                else_=None,
            ).cast(Numeric)
        ),
        0,
    ).label("avg_symptoms_lutea")

    query = (
        select(
            cycles_table.c.start_date,
            func.coalesce(
                func.avg(flow_expr).cast(Numeric), 1.5
            ).label("avg_flow_level"),
            symptom_count_expr,
        )
        .select_from(
            cycles_table
            .outerjoin(daily_logs_table, daily_logs_table.c.cycle_id == cycles_table.c.id)
            .outerjoin(
                symptom_count_subq,
                symptom_count_subq.c.log_id == daily_logs_table.c.id,
            )
        )
        .where(cycles_table.c.user_id == user_id)
        .group_by(cycles_table.c.id, cycles_table.c.start_date, cycles_table.c.end_date)
        .order_by(cycles_table.c.start_date.asc())
    )

    async with engine.connect() as conn:
        result = await conn.execute(query)
        return [dict(row._mapping) for row in result.fetchall()]
