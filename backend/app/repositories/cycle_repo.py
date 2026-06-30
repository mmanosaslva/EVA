from datetime import date
from typing import Optional

from sqlalchemy import select, insert, update, delete, func

from app.core.db import engine
from app.models.db_tables import cycles_table

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
