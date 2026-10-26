from sqlalchemy import delete, select

from app.auth.db import User
from app.core.db import engine
from app.models.db_tables import (
    cycles_table,
    daily_logs_table,
    daily_symptoms_table,
    llm_insights_table,
    ml_models_table,
    sync_operations_table,
    users_table,
)

auth_user_table = User.__table__


async def delete_all_user_data(user_id: str) -> bool:
    """Borra la cuenta y todos sus datos en una sola transacción.

    Los deletes son explícitos (hijos antes que padres) para no depender de
    que las FK en cascada estén aplicadas en la BD (RX-08). Devuelve False si
    la cuenta no existía; en ese caso no se borra nada.
    """
    user_cycles = select(cycles_table.c.id).where(cycles_table.c.user_id == user_id)
    user_logs = select(daily_logs_table.c.id).where(daily_logs_table.c.cycle_id.in_(user_cycles))

    async with engine.begin() as conn:
        exists = await conn.execute(
            select(auth_user_table.c.id).where(auth_user_table.c.id == user_id)
        )
        if exists.first() is None:
            return False

        await conn.execute(delete(daily_symptoms_table).where(daily_symptoms_table.c.log_id.in_(user_logs)))
        await conn.execute(delete(daily_logs_table).where(daily_logs_table.c.cycle_id.in_(user_cycles)))
        await conn.execute(delete(cycles_table).where(cycles_table.c.user_id == user_id))
        await conn.execute(delete(ml_models_table).where(ml_models_table.c.user_id == user_id))
        await conn.execute(delete(llm_insights_table).where(llm_insights_table.c.user_id == user_id))
        await conn.execute(delete(sync_operations_table).where(sync_operations_table.c.user_id == user_id))
        await conn.execute(delete(users_table).where(users_table.c.id == user_id))
        await conn.execute(delete(auth_user_table).where(auth_user_table.c.id == user_id))
    return True
