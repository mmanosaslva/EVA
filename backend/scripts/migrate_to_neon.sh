#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# migrate_to_neon.sh — Migrar BD de Supabase a Neon
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
DUMP_FILE="/tmp/eva_supabase_dump.sql"
BACKUP_ENV="$SCRIPT_DIR/../.env.supabase.bak"

# ── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

banner() {
  echo -e "${CYAN}"
  echo "╔══════════════════════════════════════════════╗"
  echo "║   EVA — Migración Supabase → Neon           ║"
  echo "╚══════════════════════════════════════════════╝"
  echo -e "${NC}"
}

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Validar URL PostgreSQL ──────────────────────────────────
validate_url() {
  local url="$1"
  local label="$2"
  if [[ ! "$url" =~ ^postgresql:// ]] && [[ ! "$url" =~ ^postgres:// ]]; then
    error "$label no es una URL PostgreSQL válida: $url"
  fi
  log "$label OK"
}

# ── Leer DATABASE_URL del .env ──────────────────────────────
load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    error "No se encontró $ENV_FILE"
  fi

  DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d'=' -f2-)
  if [[ -z "$DATABASE_URL" ]]; then
    error "DATABASE_URL no encontrada en $ENV_FILE"
  fi

  log "DATABASE_URL cargada desde .env"
  validate_url "$DATABASE_URL" "DATABASE_URL (Supabase)"
}

# ── Obtener NEON_DATABASE_URL ───────────────────────────────
get_neon_url() {
  if [[ -n "${NEON_DATABASE_URL:-}" ]]; then
    log "Usando NEON_DATABASE_URL de variable de entorno"
  else
    echo ""
    echo -e "${CYAN}Pega la connection string de Neon:${NC}"
    read -r NEON_DATABASE_URL
    NEON_DATABASE_URL="${NEON_DATABASE_URL#"${NEON_DATABASE_URL%%[![:space:]]*}"}" # ltrim
    NEON_DATABASE_URL="${NEON_DATABASE_URL%"${NEON_DATABASE_URL##*[![:space:]]}"}" # rtrim
  fi
  validate_url "$NEON_DATABASE_URL" "NEON_DATABASE_URL"
}

# ── Paso 1: pg_dump ────────────────────────────────────────
dump_database() {
  echo ""
  warn "Se exportará la BD de Supabase (excluyendo schema auth)"
  read -p "¿Continuar? [s/N] " -r
  [[ $REPLY =~ ^[sS]$ ]] || { warn "Cancelado."; exit 0; }

  echo ""
  log "Ejecutando pg_dump..."

  pg_dump "$DATABASE_URL" \
    --exclude-schema=auth \
    --no-owner \
    --no-privileges \
    --no-comments \
    -f "$DUMP_FILE" 2>&1

  if [[ ! -f "$DUMP_FILE" ]]; then
    error "pg_dump falló — no se creó el archivo"
  fi

  local size
  size=$(du -h "$DUMP_FILE" | cut -f1)
  log "Dump creado: $DUMP_FILE ($size)"
}

# ── Paso 2: Limpiar dump ───────────────────────────────────
clean_dump() {
  log "Limpiando dump de referencias Supabase..."

  local CLEAN_SCRIPT="$SCRIPT_DIR/clean_dump.py"
  local CLEANED_FILE="${DUMP_FILE}.cleaned"

  python3 "$CLEAN_SCRIPT" "$DUMP_FILE" "$CLEANED_FILE"

  mv "$CLEANED_FILE" "$DUMP_FILE"

  local new_size
  new_size=$(du -h "$DUMP_FILE" | cut -f1)
  log "Dump limpiado ($new_size)"
}

# ── Paso 3: Restaurar en Neon ──────────────────────────────
restore_database() {
  echo ""
  warn "Se restaurará el dump en Neon"
  warn "Está acción sobrescribirá tablas existentes en Neon"
  read -p "¿Continuar? [s/N] " -r
  [[ $REPLY =~ ^[sS]$ ]] || { warn "Cancelado."; exit 0; }

  echo ""
  log "Restaurando en Neon..."

  psql "$NEON_DATABASE_URL" -f "$DUMP_FILE" 2>&1 | tail -20

  log "Restore completado"
}

# ── Paso 4: Validar migración ──────────────────────────────
validate_migration() {
  log "Validando migración..."

  local tables
  tables=$(psql "$NEON_DATABASE_URL" -t -A -c \
    "SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null)

  if [[ "$tables" -ne 10 ]]; then
    error "Se esperaban 10 tablas (9 app + alembic_version), se encontraron $tables"
  fi
  log "Tablas: $tables/10 ✓"

  local symptoms
  symptoms=$(psql "$NEON_DATABASE_URL" -t -A -c \
    "SELECT count(*) FROM symptoms_catalog;" 2>/dev/null)

  if [[ "$symptoms" -ne 30 ]]; then
    warn "Se esperaban 30 síntomas, se encontraron $symptoms"
  else
    log "Síntomas: $symptoms/30 ✓"
  fi

  local triggers
  triggers=$(psql "$NEON_DATABASE_URL" -t -A -c \
    "SELECT count(*) FROM information_schema.triggers
     WHERE trigger_schema = 'public';" 2>/dev/null)
  log "Triggers: $triggers ✓"

  local functions
  functions=$(psql "$NEON_DATABASE_URL" -t -A -c \
    "SELECT count(*) FROM information_schema.routines
     WHERE routine_schema = 'public';" 2>/dev/null)
  log "Funciones: $functions ✓"

  echo ""
  log "Migración validada exitosamente"
}

# ── Paso 5: Actualizar .env ────────────────────────────────
update_env() {
  echo ""
  warn "Se actualizará DATABASE_URL en .env"
  warn "Se creará respaldo en $BACKUP_ENV"
  read -p "¿Continuar? [s/N] " -r
  [[ $REPLY =~ ^[sS]$ ]] || { warn "Saltando actualización de .env"; return; }

  # Backup
  cp "$ENV_FILE" "$BACKUP_ENV"
  log "Backup creado: $BACKUP_ENV"

  # Reemplazar DATABASE_URL
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEON_DATABASE_URL|" "$ENV_FILE"
  log ".env actualizado con URL de Neon"
}

# ── Paso 6: Limpieza ───────────────────────────────────────
cleanup() {
  echo ""
  read -p "¿Eliminar el dump temporal ($DUMP_FILE)? [s/N] " -r
  if [[ $REPLY =~ ^[sS]$ ]]; then
    rm -f "$DUMP_FILE" "${DUMP_FILE}.bak"
    log "Dump eliminado"
  else
    warn "Dump conservado en $DUMP_FILE"
  fi
}

# ── Main ────────────────────────────────────────────────────
main() {
  banner
  load_env
  get_neon_url
  dump_database
  clean_dump
  restore_database
  validate_migration
  update_env
  cleanup

  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════╗"
  echo "║   Migración completada exitosamente         ║"
  echo -e "╚══════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Próximos pasos:"
  echo "  1. Reinicia el backend: cd backend && uvicorn app.main:app --reload"
  echo "  2. Verifica que la app funcione correctamente"
  echo "  3. Si todo está bien, elimina el dump: rm $DUMP_FILE"
}

main "$@"
