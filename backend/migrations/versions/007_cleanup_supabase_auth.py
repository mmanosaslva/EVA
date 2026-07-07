"""cleanup_supabase_auth

Revision ID: 007
Revises: 006
Create Date: 2026-07-05

Limpia triggers y estructuras heredadas de Supabase Auth que ya no se usan.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE")
    op.execute("DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users CASCADE")
    op.execute("DROP FUNCTION IF EXISTS app_hidden.handle_new_user() CASCADE")
    op.execute("DROP FUNCTION IF EXISTS app_hidden.handle_user_delete() CASCADE")


def downgrade() -> None:
    pass
