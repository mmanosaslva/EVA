from datetime import date

from sqlalchemy import select, insert, update, delete, func

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


async def get_logs_by_cycle_paginated(
    cycle_id: str, limit: int = 50, offset: int = 0
) -> list:
    query = (
        select(*LOG_COLUMNS)
        .where(daily_logs_table.c.cycle_id == cycle_id)
        .order_by(daily_logs_table.c.date)
        .limit(limit)
        .offset(offset)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.fetchall()


async def create_daily_log(data: dict) -> dict:
    query = insert(daily_logs_table).values(**data).returning(*LOG_COLUMNS)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        row = result.one()
        return dict(row._mapping)


async def get_daily_log_by_id(log_id: str):
    query = select(*LOG_COLUMNS).where(daily_logs_table.c.id == log_id)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.one_or_none()


async def get_daily_log_by_date(cycle_id: str, log_date: date):
    query = (
        select(*LOG_COLUMNS)
        .where(daily_logs_table.c.cycle_id == cycle_id)
        .where(daily_logs_table.c.date == log_date)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.one_or_none()


async def update_daily_log(log_id: str, data: dict) -> dict | None:
    query = (
        update(daily_logs_table)
        .where(daily_logs_table.c.id == log_id)
        .values(**data)
        .returning(*LOG_COLUMNS)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        row = result.one_or_none()
        return dict(row._mapping) if row else None


async def delete_daily_log(log_id: str) -> bool:
    query = delete(daily_logs_table).where(daily_logs_table.c.id == log_id)
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        return result.rowcount > 0


async def count_logs_by_cycle(cycle_id: str) -> int:
    query = (
        select(func.count())
        .select_from(daily_logs_table)
        .where(daily_logs_table.c.cycle_id == cycle_id)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.scalar_one()
