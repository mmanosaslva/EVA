from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = (
    create_async_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={"prepared_statement_cache_size": 0},
    )
    if DATABASE_URL
    else None
)