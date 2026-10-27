"""rate_limits

Revision ID: 010
Revises: 009
Create Date: 2026-10-27

Contadores del rate limit (app/core/rate_limit.py). En Vercel no hay memoria compartida
entre instancias, así que los contadores viven en la base de datos (DP-43, T25).
`bucket` es un SHA-256: la tabla no guarda IPs ni user_id.

No se aplica automáticamente (RX-09). Mery ejecuta el SQL equivalente:
Docs/s10/sql/T25-rate-limits.sql
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rate_limits",
        sa.Column("bucket", sa.String(64), primary_key=True),
        sa.Column("window_start", sa.BigInteger, primary_key=True),
        sa.Column("hits", sa.Integer, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("rate_limits")
