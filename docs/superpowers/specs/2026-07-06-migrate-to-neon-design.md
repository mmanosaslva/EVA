# Design: Migración Supabase → Neon

**Date:** 2026-07-06
**Status:** Approved
**Approach:** pg_dump + psql (Option 1)

## Context

The EVA project uses Supabase purely as a hosted PostgreSQL database. Auth has already been migrated to fastapi-users (JWT-based). The `auth` schema from Supabase is no longer used. The goal is to migrate the database to Neon (serverless PostgreSQL).

## Scope

Migrate all 10 tables in `public` schema (9 app tables + `alembic_version`), triggers, functions, and data from Supabase to Neon. Exclude the `auth` schema (Supabase-internal).

## Tables to Migrate

| Table | Description |
|-------|-------------|
| `"user"` | fastapi-users auth table |
| `users` | User profiles |
| `cycles` | Menstrual cycles |
| `daily_logs` | Daily tracking |
| `symptoms_catalog` | 30 predefined symptoms |
| `daily_symptoms` | Log ↔ symptom junction |
| `ml_models` | ML model storage |
| `llm_insights` | AI insights |
| `sync_operations` | Offline sync queue |

## Script: `backend/scripts/migrate_to_neon.sh`

### Flow

```
1. Read DATABASE_URL from backend/.env (Supabase)
2. Accept NEON_DATABASE_URL as argument or prompt interactively
3. Validate both URLs are valid PostgreSQL connection strings
4. pg_dump from Supabase → /tmp/eva_supabase_dump.sql
   - --exclude-schema=auth (Supabase-internal, not needed)
   - --no-owner (avoid permission issues between hosts)
   - --no-privileges (same reason)
5. Clean dump file:
   - Remove CREATE EXTENSION lines (Neon has them natively)
   - Remove supabase_admin role references
   - Remove search_path warnings
   - Remove CREATE PUBLICATION (Supabase-specific)
   - Remove CREATE EVENT TRIGGER and SQL body (WHEN TAG, EXECUTE FUNCTION)
   - Remove ALTER TABLE referencing auth schema
   - Remove all Supabase schema objects (extensions, realtime, storage, pgbouncer, graphql, vault, app_hidden, net, supabase_functions)
   - Remove RLS policies (use auth.uid() which doesn't exist in Neon; app validates user_id in backend)
6. Restore to Neon with psql
7. Validate migration:
   - Count tables in public schema (expect 9)
   - Verify triggers exist (trg_create_user_profile, trg_*_updated_at)
   - Count symptoms_catalog rows (expect 30)
8. Update backend/.env with Neon URL (backup .env first)
9. Optionally delete temp dump file
```

### Security

- Confirmation prompts before destructive operations
- .env backup created as .env.supabase.bak before modification
- Dump file in /tmp/ (deleted on reboot or manually)
- No hardcoded credentials in script

### Validation Post-Migration

```sql
-- Table count
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Expected: 10 (9 app tables + alembic_version)

-- Trigger check
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_schema = 'public';
-- Expected: trg_create_user_profile, trg_users_updated_at,
--           trg_cycles_updated_at, trg_daily_logs_updated_at

-- Symptoms count
SELECT count(*) FROM symptoms_catalog;
-- Expected: 30
```

## Files

- **Create:** `backend/scripts/migrate_to_neon.sh`
- **Modify:** `backend/.env` (update DATABASE_URL after migration)
