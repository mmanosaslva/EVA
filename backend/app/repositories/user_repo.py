from dataclasses import dataclass

from sqlalchemy import select, func

from app.core.db import engine
from app.models.db_tables import users_table, cycles_table, ml_models_table


@dataclass
class UserCycleInfo:
    id: str
    email: str


async def get_users_with_new_cycles() -> list[UserCycleInfo]:
    last_cycle_subq = (
        select(
            cycles_table.c.user_id,
            func.max(cycles_table.c.created_at).label("last_cycle_at"),
        )
        .group_by(cycles_table.c.user_id)
    ).subquery("last_cycle")

    query = (
        select(users_table.c.id, users_table.c.email)
        .select_from(
            users_table
            .join(last_cycle_subq, users_table.c.id == last_cycle_subq.c.user_id)
            .outerjoin(ml_models_table, users_table.c.id == ml_models_table.c.user_id)
        )
        .where(
            (ml_models_table.c.user_id.is_(None))
            | (last_cycle_subq.c.last_cycle_at > ml_models_table.c.trained_at)
        )
        .order_by(users_table.c.id)
    )

    async with engine.connect() as conn:
        result = await conn.execute(query)
        return [UserCycleInfo(id=str(row.id), email=row.email) for row in result.fetchall()]


async def get_all_active_users() -> list[UserCycleInfo]:
    query = select(users_table.c.id, users_table.c.email).order_by(users_table.c.id)

    async with engine.connect() as conn:
        result = await conn.execute(query)
        return [UserCycleInfo(id=str(row.id), email=row.email) for row in result.fetchall()]
