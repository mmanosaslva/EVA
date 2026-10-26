"""account_cascade

Revision ID: 009
Revises: 008
Create Date: 2026-10-26

Borrado total de cuenta (Docs/s10/restricciones.md RX-08):
- FK users.id → "user".id ON DELETE CASCADE: borrar la cuenta borra el perfil
  y, por las FK existentes, todos sus datos.
- El trigger create_user_profile deja de reasignar perfiles por email, que
  hacía que un re-registro heredara los datos de una cuenta borrada.

No se aplica automáticamente (RX-09). Mery ejecuta el SQL equivalente:
Docs/s10/sql/T4-borrado-total.sql (incluye la limpieza previa de huérfanos).
"""
from typing import Sequence, Union

from alembic import op


revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FK_NAME = "users_id_auth_user_fkey"


def upgrade() -> None:
    op.execute('DELETE FROM public.users u WHERE NOT EXISTS (SELECT 1 FROM public."user" a WHERE a.id = u.id)')
    op.create_foreign_key(_FK_NAME, "users", "user", ["id"], ["id"], ondelete="CASCADE")
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


def downgrade() -> None:
    # Restaura la función de 008 (con la reasignación por email) y quita la FK.
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
    op.drop_constraint(_FK_NAME, "users", type_="foreignkey")
