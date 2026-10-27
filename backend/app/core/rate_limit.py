"""Rate limit con contadores en la base de datos (Docs/s10/fases-tareas-restructurados.md T25, DP-43).

En Vercel cada request puede caer en una instancia distinta, así que un contador en memoria
(como el de slowapi) no limita nada. Aquí cada petición suma 1 a la fila (bucket, ventana)
con un solo INSERT ... ON CONFLICT DO UPDATE, que es atómico en PostgreSQL.

- Ventana fija: `window_start` es el inicio de la ventana en segundos epoch.
- `bucket` es el SHA-256 de "alcance:quién", así la tabla no guarda IPs ni user_id.
- Si la base de datos falla, el límite no bloquea (fail-open) y se registra un warning.
"""

import hashlib
import logging
import time

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.core import db
from app.core.security import get_current_user
from app.models.db_tables import rate_limits_table

logger = logging.getLogger(__name__)

# Las ventanas más largas son de un día; lo anterior a esto ya no cuenta para ningún límite.
_RETENTION_SECONDS = 2 * 24 * 3600


def client_ip(request: Request) -> str:
    """IP de quien hace la petición. En Vercel la entregan x-real-ip y x-forwarded-for."""
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _bucket(scope: str, who: str) -> str:
    return hashlib.sha256(f"{scope}:{who}".encode()).hexdigest()


async def hit(scope: str, who: str, window_seconds: int) -> int:
    """Suma una petición a la ventana actual y devuelve cuántas lleva."""
    now = int(time.time())
    window_start = now - now % window_seconds
    insert = pg_insert if db.engine.dialect.name == "postgresql" else sqlite_insert
    stmt = (
        insert(rate_limits_table)
        .values(bucket=_bucket(scope, who), window_start=window_start, hits=1)
        .on_conflict_do_update(
            index_elements=["bucket", "window_start"],
            set_={"hits": rate_limits_table.c.hits + 1},
        )
        .returning(rate_limits_table.c.hits)
    )
    async with db.engine.begin() as conn:
        hits = (await conn.execute(stmt)).scalar_one()
        if hits == 1:
            # Primera petición de una ventana nueva: se aprovecha para borrar ventanas viejas.
            await conn.execute(
                delete(rate_limits_table).where(rate_limits_table.c.window_start < now - _RETENTION_SECONDS)
            )
    return hits


async def _enforce(scope: str, who: str, limit: int, window_seconds: int) -> None:
    try:
        hits = await hit(scope, who, window_seconds)
    except Exception:
        logger.warning("Rate limit no disponible para %s; se deja pasar la petición", scope, exc_info=True)
        return
    if hits > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas solicitudes. Intenta de nuevo más tarde.",
            headers={"Retry-After": str(window_seconds - int(time.time()) % window_seconds)},
        )


def limit_per_user(scope: str, limit: int, window_seconds: int):
    """Límite por usuaria autenticada (usa el user_id del token ya verificado)."""
    async def dependency(current_user: dict = Depends(get_current_user)) -> None:
        await _enforce(scope, current_user["user_id"], limit, window_seconds)
    return dependency


def limit_per_ip(scope: str, limit: int, window_seconds: int):
    """Límite por IP, para endpoints sin sesión (login, registro, emails)."""
    async def dependency(request: Request) -> None:
        await _enforce(scope, client_ip(request), limit, window_seconds)
    return dependency
