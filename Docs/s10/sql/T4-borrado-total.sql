-- =====================================================================
-- EVA · T4 · Borrado total de cuenta (RX-08)
-- Lo ejecuta Mery a mano en la consola SQL de Neon (RX-09).
-- Equivale a backend/migrations/versions/009_account_cascade.py
--
-- ORDEN OBLIGATORIO:
--   0. Snapshot manual en Neon ANTES de empezar.
--   1. Diagnóstico (solo lectura). Anotar los números.
--   2. Limpieza de huérfanos (solo si el paso 1 devuelve > 0).
--   3. FK users → "user" con ON DELETE CASCADE.
--   4. Trigger sin reasignación por email.
--   5. Versión de alembic.
--   6. Verificación.
-- Ningún paso muestra emails ni datos de salud: solo conteos.
-- =====================================================================


-- ── 1. DIAGNÓSTICO (solo lectura) ───────────────────────────────────
-- 1a. Perfiles sin cuenta: datos de cuentas "borradas" que quedaron huérfanos.
SELECT count(*) AS perfiles_huerfanos
FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public."user" a WHERE a.id = u.id);

-- 1b. Cuántos datos de salud cuelgan de esos perfiles huérfanos.
SELECT
  (SELECT count(*) FROM public.cycles       c WHERE c.user_id IN (SELECT u.id FROM public.users u WHERE NOT EXISTS (SELECT 1 FROM public."user" a WHERE a.id = u.id))) AS ciclos,
  (SELECT count(*) FROM public.llm_insights i WHERE i.user_id IN (SELECT u.id FROM public.users u WHERE NOT EXISTS (SELECT 1 FROM public."user" a WHERE a.id = u.id))) AS insights;

-- 1c. Cuentas sin perfil (no deberían existir; el trigger crea el perfil).
SELECT count(*) AS cuentas_sin_perfil
FROM public."user" a
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.id);

-- 1d. Versión actual de alembic (se espera '008').
SELECT version_num FROM public.alembic_version;


-- ── 2. LIMPIEZA (solo si 1a > 0 o 1c > 0) ───────────────────────────
-- 2a. Borra los perfiles huérfanos. Las FK existentes (ON DELETE CASCADE)
--     arrastran sus ciclos, registros, síntomas, modelos, insights y sync.
--     Son datos de cuentas que ya pidieron ser borradas (RX-08).
BEGIN;
DELETE FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public."user" a WHERE a.id = u.id);
COMMIT;

-- 2b. Crea el perfil que falte para cuentas existentes.
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT a.id, a.email, NOW(), NOW()
FROM public."user" a
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.id)
ON CONFLICT DO NOTHING;


-- ── 3. FK: borrar la cuenta borra el perfil y todo en cascada ───────
ALTER TABLE public.users
  ADD CONSTRAINT users_id_auth_user_fkey
  FOREIGN KEY (id) REFERENCES public."user"(id) ON DELETE CASCADE;


-- ── 4. TRIGGER: nunca reasignar datos por email ─────────────────────
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- (el trigger trg_create_user_profile ya apunta a esta función; no hace falta recrearlo)


-- ── 5. ALEMBIC: registrar que la BD está en la versión 009 ──────────
UPDATE public.alembic_version SET version_num = '009' WHERE version_num = '008';


-- ── 6. VERIFICACIÓN (todo debe dar 0 / la FK debe existir) ──────────
SELECT count(*) AS perfiles_huerfanos
FROM public.users u WHERE NOT EXISTS (SELECT 1 FROM public."user" a WHERE a.id = u.id);

SELECT conname, confdeltype   -- confdeltype = 'c' significa ON DELETE CASCADE
FROM pg_constraint WHERE conname = 'users_id_auth_user_fkey';

SELECT position('IF FOUND' IN pg_get_functiondef('public.create_user_profile'::regproc)) AS reasigna_por_email;  -- debe ser 0

SELECT version_num FROM public.alembic_version;  -- debe ser '009'
