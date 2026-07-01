"""fix_security_warnings

Revision ID: 004
Revises: 003
Create Date: 2026-07-01

Corrige 4 warnings del Supabase Security Advisor:
  - search_path mutable en update_updatedata() y handle_new_user()
  - handle_new_user() expuesta como SECURITY DEFINER vía RPC a anon y authenticated

Estrategia: mover handle_new_user() de public a app_hidden (schema privado
que PostgREST no expone via /rest/v1/rpc/), mas ALTER DEFAULT PRIVILEGES
para que no se regranteen permisos automaticamente al recrear la funcion.

Ejecutar: alembic upgrade head
"""

from typing import Sequence, Union

from alembic import op


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


HANDLE_NEW_USER_BODY = """
INSERT INTO public.users (id, email, created_at, updated_at)
VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;
RETURN NEW;
"""


def upgrade() -> None:
    # -- Warning #1: fijar search_path en update_updated_at --
    op.execute("""
    DO $mig$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'update_updated_at' AND n.nspname = 'public'
      ) THEN
        EXECUTE format('ALTER FUNCTION public.update_updated_at() SET search_path = %L', '');
      END IF;
    END;
    $mig$;
    """)

    # -- Warnings #2, #3, #4: mover handle_new_user a schema privado --
    op.execute("CREATE SCHEMA IF NOT EXISTS app_hidden;")

    # Crear funcion en app_hidden con search_path fijo
    op.execute(f"""
    CREATE OR REPLACE FUNCTION app_hidden.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = 'public'
    AS $$
    BEGIN
{HANDLE_NEW_USER_BODY}
    END;
    $$;
    """)

    # Recrear trigger apuntando a app_hidden (DROP + CREATE porque
    # PostgreSQL no soporta CREATE OR REPLACE TRIGGER directo)
    op.execute("""
    DO $mig$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
          AND tgrelid = 'auth.users'::regclass
      ) THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      END IF;

      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION app_hidden.handle_new_user();
    END;
    $mig$;
    """)

    # Eliminar funcion expuesta del schema public
    op.execute("""
    DO $mig$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'handle_new_user' AND n.nspname = 'public'
      ) THEN
        DROP FUNCTION public.handle_new_user();
      END IF;
    END;
    $mig$;
    """)

    # Nota: no tocamos ALTER DEFAULT PRIVILEGES de supabase_admin
    # porque requiere superuser. Cualquier nueva funcion SECURITY DEFINER
    # en public debera crearse directamente en app_hidden en vez.


def downgrade() -> None:
    # Recrear funcion en public
    op.execute(f"""
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = 'public'
    AS $$
    BEGIN
{HANDLE_NEW_USER_BODY}
    END;
    $$;
    """)

    # Re-apuntar trigger a public
    op.execute("""
    DO $mig$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
          AND tgrelid = 'auth.users'::regclass
      ) THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      END IF;

      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
    END;
    $mig$;
    """)

    # Eliminar funcion de app_hidden
    op.execute("""
    DO $mig$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'handle_new_user' AND n.nspname = 'app_hidden'
      ) THEN
        DROP FUNCTION app_hidden.handle_new_user();
      END IF;
    END;
    $mig$;
    """)

    pass
