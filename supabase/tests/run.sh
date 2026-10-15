#!/usr/bin/env bash
# Applies the migrations to a throwaway local Postgres and runs the RLS checks.
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
DIR=$(mktemp -d)
trap '"$BIN/pg_ctl" -D "$DIR/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
"$BIN/initdb" -D "$DIR/data" -U postgres >/dev/null
"$BIN/pg_ctl" -D "$DIR/data" -o "-k $DIR -p 54329 -c listen_addresses=''" -l "$DIR/log" start >/dev/null
PSQL=(psql -h "$DIR" -p 54329 -U postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f tests/supabase_shim.sql
for f in migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f tests/rls_test.sql
