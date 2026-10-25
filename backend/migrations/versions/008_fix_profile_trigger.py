"""fix_profile_trigger

Revision ID: 008
Revises: 007
Create Date: 2026-07-06

Corrige el trigger create_user_profile para vincular perfiles existentes
con nuevas cuentas de auth, y cambia los FK a ON UPDATE CASCADE.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TABLES_WITH_FK = ["cycles", "ml_models", "llm_insights", "sync_operations"]


def upgrade() -> None:
    for table in _TABLES_WITH_FK:
        op.drop_constraint(f"{table}_user_id_fkey", table, type_="foreignkey")
        op.create_foreign_key(
            f"{table}_user_id_fkey",
            table, "users",
            ["user_id"], ["id"],
            ondelete="CASCADE",
            onupdate="CASCADE",
        )

    op.execute('DROP TRIGGER IF EXISTS trg_create_user_profile ON "user"')

    op.execute("""
        CREATE OR REPLACE FUNCTION public.create_user_profile()
        RETURNS TRIGGER AS $$
        DECLARE
            existing_id UUID;
        BEGIN
            SELECT id INTO existing_id FROM public.users WHERE email = NEW.email;

            IF FOUND THEN
                UPDATE public.users SET id = NEW.id, updated_at = NOW()
                WHERE id = existing_id;
            ELSIF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
                INSERT INTO public.users (id, email, created_at, updated_at)
                VALUES (NEW.id, NEW.email, NOW(), NOW());
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER trg_create_user_profile
            AFTER INSERT ON "user"
            FOR EACH ROW
            EXECUTE FUNCTION public.create_user_profile();
    """)


def downgrade() -> None:
    op.execute('DROP TRIGGER IF EXISTS trg_create_user_profile ON "user"')

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

    op.execute("""
        CREATE TRIGGER trg_create_user_profile
            AFTER INSERT ON "user"
            FOR EACH ROW
            EXECUTE FUNCTION public.create_user_profile();
    """)

    for table in _TABLES_WITH_FK:
        op.drop_constraint(f"{table}_user_id_fkey", table, type_="foreignkey")
        op.create_foreign_key(
            f"{table}_user_id_fkey",
            table, "users",
            ["user_id"], ["id"],
            ondelete="CASCADE",
            onupdate="NO ACTION",
        )
