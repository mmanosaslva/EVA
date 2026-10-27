from collections.abc import AsyncGenerator
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

# En Vercel cada instancia de la función es efímera: no se guarda un pool propio y cada
# request abre su conexión contra el pooler de Neon (Docs/s10/restricciones.md RX-09).
POOL_ARGS = {"poolclass": NullPool} if settings.VERCEL else {"pool_size": 5, "max_overflow": 5}

if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Strip query params that asyncpg doesn't understand
    parsed = urlparse(DATABASE_URL)
    if parsed.query:
        params = parse_qs(parsed.query)
        ssl_mode = params.pop('sslmode', [None])[0]
        params.pop('channel_binding', None)
        clean_query = urlencode(params, doseq=True)
        DATABASE_URL = urlunparse(parsed._replace(query=clean_query))
    else:
        ssl_mode = None

    connect_args = {"statement_cache_size": 0}
    if ssl_mode:
        connect_args["ssl"] = ssl_mode

    engine = create_async_engine(DATABASE_URL, connect_args=connect_args, **POOL_ARGS) if DATABASE_URL else None
else:
    engine = create_async_engine(DATABASE_URL, connect_args={"statement_cache_size": 0}, **POOL_ARGS) if DATABASE_URL else None

async_session_maker = async_sessionmaker(engine, expire_on_commit=False) if engine else None


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session