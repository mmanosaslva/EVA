-- =====================================================================
-- EVA · T25 · Tabla de contadores del rate limit (DP-43)
-- Lo ejecuta Mery a mano en la consola SQL de Neon (RX-09).
-- Equivale a backend/migrations/versions/010_rate_limits.py
--
-- Se ejecuta en CADA branch de Neon que use la app:
--   - el de producción (endpoint ep-bold-bread, base neondb)
--   - el branch de previews (ver Docs/DEPLOY.md)
--
-- ORDEN:
--   0. Snapshot manual en Neon ANTES de empezar (solo en producción).
--   1. Comprobar la versión de alembic (se espera '009').
--   2. Crear la tabla.
--   3. Versión de alembic → 010.
--   4. Verificación.
-- La tabla no guarda datos personales: "bucket" es un hash SHA-256.
-- =====================================================================


-- ── 1. VERSIÓN ACTUAL (se espera '009') ─────────────────────────────
SELECT version_num FROM public.alembic_version;


-- ── 2. TABLA ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
    bucket       VARCHAR(64) NOT NULL,
    window_start BIGINT      NOT NULL,
    hits         INTEGER     NOT NULL,
    PRIMARY KEY (bucket, window_start)
);


-- ── 3. ALEMBIC ──────────────────────────────────────────────────────
UPDATE public.alembic_version SET version_num = '010' WHERE version_num = '009';


-- ── 4. VERIFICACIÓN ─────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'rate_limits') AS tabla_existe,   -- 1
  (SELECT version_num FROM public.alembic_version)                  AS alembic;       -- 010
