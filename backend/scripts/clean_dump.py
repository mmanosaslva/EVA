#!/usr/bin/env python3
"""
clean_dump.py — Limpia pg_dump de Supabase para Neon.
Elimina schemas de Supabase, RLS, SQL huérfano.
Agrega DROP IF EXISTS para idempotencia.
"""
import re
import sys

SUPABASE_SCHEMAS = {
    'auth', 'extensions', 'realtime', 'storage', 'pgbouncer',
    'graphql', 'graphql_public', 'vault', 'app_hidden', 'net',
    'supabase_functions'
}

SCHEMA_PATTERN = '|'.join(SUPABASE_SCHEMAS)

# Cualquier línea que contenga <schema>.<algo> de Supabase
SUPABASE_REF_RE = re.compile(r'\b(' + SCHEMA_PATTERN + r')\.')

# Constraints de Supabase storage que deben eliminarse
SUPABASE_CONSTRAINTS = {
    's3_multipart_uploads_pkey', 's3_multipart_uploads_parts_pkey',
    'vector_indexes_pkey',
    's3_multipart_uploads_bucket_id_fkey', 's3_multipart_uploads_parts_bucket_id_fkey',
    's3_multipart_uploads_parts_upload_id_fkey', 'vector_indexes_bucket_id_fkey',
    'buckets_pkey', 'buckets_analytics_pkey', 'buckets_vectors_pkey',
    'objects_pkey', 'migrations_pkey', 'migrations_name_key',
    'messages_pkey', 'messages_payload_exclusive',
    'pk_subscription', 'schema_migrations_pkey',
}


def is_orphaned_policy_body(stripped: str) -> bool:
    """Check if a line is an orphaned part of an RLS policy body."""
    orphaned = {
        'FROM public.cycles',
        'FROM public.daily_logs dl',
        'FROM (public.daily_logs dl',
        'JOIN public.cycles c ON ((c.id = dl.cycle_id)))',
        'WHERE (c.user_id = auth.uid()))));',
        'WHERE (cycles.user_id = auth.uid()))));',
    }
    return stripped in orphaned


def clean_dump(input_path: str, output_path: str):
    with open(input_path, 'r') as f:
        lines = f.readlines()

    out = []
    skip_count = 0

    for line in lines:
        stripped = line.strip()

        if not stripped:
            out.append(line)
            continue

        # ── Skip patterns that should never appear ──
        if re.match(r'CREATE EXTENSION', stripped):
            skip_count += 1
            continue
        if re.match(r'SET search_path\s*=', stripped):
            skip_count += 1
            continue
        if 'supabase_admin' in stripped:
            skip_count += 1
            continue
        if stripped.startswith('-- Name:'):
            skip_count += 1
            continue
        if stripped.startswith('-- Publications'):
            skip_count += 1
            continue
        if stripped.startswith('-- Event Triggers'):
            skip_count += 1
            continue
        if re.match(r'CREATE PUBLICATION', stripped):
            skip_count += 1
            continue
        if re.match(r'CREATE EVENT TRIGGER', stripped):
            skip_count += 1
            continue
        if re.match(r'ALTER PUBLICATION', stripped):
            skip_count += 1
            continue
        if re.match(r'ALTER EVENT TRIGGER', stripped):
            skip_count += 1
            continue
        if stripped.startswith('WHEN TAG IN'):
            skip_count += 1
            continue
        if re.match(r'EXECUTE FUNCTION extensions\.', stripped):
            skip_count += 1
            continue
        if re.match(r'SET wal_level', stripped):
            skip_count += 1
            continue

        # ── RLS ──
        if 'ENABLE ROW LEVEL SECURITY' in stripped:
            skip_count += 1
            continue
        if re.match(r'CREATE POLICY', stripped):
            skip_count += 1
            continue

        # ── Orphaned policy body fragments ──
        if is_orphaned_policy_body(stripped):
            skip_count += 1
            continue

        # ── ANY reference to a Supabase schema namespace ──
        if SUPABASE_REF_RE.search(stripped):
            skip_count += 1
            continue

        # ── Orphaned data comments (harmless but noisy) ──
        if re.match(r'-- Data for Name:.*Schema: (?:' + SCHEMA_PATTERN + r')', stripped):
            skip_count += 1
            continue

        # ── Constraints on Supabase tables ──
        con_match = re.match(r'ADD CONSTRAINT\s+(\w+)', stripped)
        if con_match:
            con_name = con_match.group(1)
            if con_name in SUPABASE_CONSTRAINTS:
                skip_count += 1
                continue

        # ── Add DROP IF EXISTS for idempotence ──
        tbl_match = re.match(r'^CREATE TABLE (?:IF NOT EXISTS )?((?:ONLY\s+)?[\w."]+)\s*\(', stripped)
        if tbl_match:
            tbl_name = tbl_match.group(1)
            out.append(f'DROP TABLE IF EXISTS {tbl_name} CASCADE;\n')

        index_match = re.match(r'^CREATE (UNIQUE )?INDEX\s+(\w+)\s+ON\s+(?:ONLY\s+)?([\w."]+)', stripped)
        if index_match:
            idx_name = index_match.group(2)
            out.append(f'DROP INDEX IF EXISTS {idx_name};\n')

        trg_match = re.match(r'^CREATE TRIGGER\s+(\w+)\s+.*ON\s+([\w."]+)', stripped)
        if trg_match:
            trg_name = trg_match.group(1)
            table_name = trg_match.group(2)
            out.append(f'DROP TRIGGER IF EXISTS {trg_name} ON {table_name};\n')

        if con_match:
            con_name = con_match.group(1)
            indent = ' ' * (len(line) - len(line.lstrip()))
            out.append(f'{indent}DROP CONSTRAINT IF EXISTS {con_name},\n')

        out.append(line)

    # Clean up multiple blank lines
    final = []
    prev_blank = False
    for line in out:
        is_blank = line.strip() == ''
        if is_blank and prev_blank:
            continue
        final.append(line)
        prev_blank = is_blank

    with open(output_path, 'w') as f:
        f.writelines(final)

    print(f"OK: {skip_count} líneas eliminadas, {len(final)} líneas escritas")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"Uso: {sys.argv[0]} <input.sql> <output.sql>")
        sys.exit(1)
    clean_dump(sys.argv[1], sys.argv[2])
