"""add_sync_server_id

Revision ID: 005
Revises: 004
Create Date: 2025-07-01

Agrega columna server_id a sync_operations para mapear client_id → server_id
en operaciones de sincronización offline.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sync_operations",
        sa.Column("server_id", sa.String(36), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sync_operations", "server_id")
