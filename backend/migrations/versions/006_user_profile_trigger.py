"""user_profile_trigger

Revision ID: 006
Revises: 005
Create Date: 2026-07-05

Agrega trigger AFTER INSERT en la tabla "user" que inserta automáticamente
una fila en public.users con el mismo id y email.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION public.create_user_profile()
        RETURNS TRIGGER AS $$
        BEGIN
            INSERT INTO public.users (id, email, created_at, updated_at)
            VALUES (NEW.id, NEW.email, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute('DROP TRIGGER IF EXISTS trg_create_user_profile ON "user"')
    op.execute("""
        CREATE TRIGGER trg_create_user_profile
            AFTER INSERT ON "user"
            FOR EACH ROW
            EXECUTE FUNCTION public.create_user_profile();
    """)


def downgrade() -> None:
    op.execute('DROP TRIGGER IF EXISTS trg_create_user_profile ON "user"')
    op.execute("DROP FUNCTION IF EXISTS public.create_user_profile()")
