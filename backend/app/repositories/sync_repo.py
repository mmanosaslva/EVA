from sqlalchemy import select, insert

from app.core.db import engine
from app.models.db_tables import sync_operations_table

SYNC_COLUMNS = [
    sync_operations_table.c.id,
    sync_operations_table.c.user_id,
    sync_operations_table.c.client_id,
    sync_operations_table.c.type,
    sync_operations_table.c.payload,
    sync_operations_table.c.status,
    sync_operations_table.c.server_id,
    sync_operations_table.c.applied_at,
]


async def find_by_client_id(client_id: str):
    query = select(*SYNC_COLUMNS).where(
        sync_operations_table.c.client_id == client_id
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.one_or_none()


async def insert_sync_operation(data: dict) -> dict:
    query = (
        insert(sync_operations_table)
        .values(**data)
        .returning(*SYNC_COLUMNS)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        await conn.commit()
        row = result.one()
        return dict(row._mapping)


async def resolve_client_id(client_id: str):
    query = (
        select(sync_operations_table.c.server_id)
        .where(sync_operations_table.c.client_id == client_id)
        .where(sync_operations_table.c.server_id.isnot(None))
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        row = result.one_or_none()
        return row[0] if row else None
