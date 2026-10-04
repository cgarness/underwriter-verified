#!/usr/bin/env bash
# Applies every migration in order to a disposable local database, reproduces the
# inherited anonymous agent-write exposure before the corrective migration, then
# checks ownership, intake, consent, and STOP behaviour after it.
# Local Unix-socket connection only. Never points at the hosted project.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_NAME="ffl_intake_test"
FIX_MIGRATION="20260929203000_lock_agent_ownership.sql"
INTAKE_MIGRATION="20260929183000_public_intake_and_sms_consent.sql"
SOCKET="${INTAKE_TEST_SOCKET:-/var/run/postgresql}"
RELEASE_ORDER=0
case "${1:-}" in
  "") ;;
  --release-order) RELEASE_ORDER=1 ;;
  *) echo "Usage: $0 [--release-order]"; exit 3 ;;
esac
[[ "$SOCKET" = /* ]] || { echo "REFUSED: socket must be a local absolute path"; exit 3; }

for var in PGHOST PGHOSTADDR PGPORT PGUSER PGPASSWORD PGDATABASE PGSERVICE DATABASE_URL SUPABASE_DB_URL POSTGRES_URL; do
  if [ -n "${!var:-}" ]; then
    echo "REFUSED: $var is set. This harness only runs against a local disposable database."
    exit 3
  fi
done

if ! command -v psql >/dev/null 2>&1; then
  echo "BLOCKED: psql is not installed, so the database tests were not executed."
  exit 2
fi

if ! sudo -u postgres psql -h "$SOCKET" -c "SELECT 1" >/dev/null 2>&1; then
  echo "BLOCKED: no local PostgreSQL server on $SOCKET."
  exit 2
fi

PSQL=(sudo -u postgres psql -h "$SOCKET" -v ON_ERROR_STOP=1 -q)
sudo -u postgres dropdb -h "$SOCKET" --if-exists "$DB_NAME"
sudo -u postgres createdb -h "$SOCKET" "$DB_NAME"

run() { "${PSQL[@]}" -d "$DB_NAME" "$@"; }

run -f "$ROOT/supabase/tests/harness_bootstrap.sql"

applied_fix=0
for migration in "$ROOT"/supabase/migrations/*.sql; do
  name="$(basename "$migration")"
  if [ "$RELEASE_ORDER" -eq 1 ] && [ "$name" = "$INTAKE_MIGRATION" ]; then continue; fi
  if [ "$name" = "$FIX_MIGRATION" ]; then
    echo "== before fix: $(basename "$FIX_MIGRATION")"
    run -f "$ROOT/supabase/tests/agents_before_fix.sql"
    applied_fix=1
  fi
  echo "== migrate $name"
  run -f "$migration"
  if [ "$RELEASE_ORDER" -eq 1 ] && [ "$name" = "$FIX_MIGRATION" ]; then
    run -c "DO \$\$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'submit_public_intake') THEN RAISE EXCEPTION 'intake exposed before ownership protection'; END IF; IF has_table_privilege('anon', 'public.agents', 'UPDATE') THEN RAISE EXCEPTION 'ownership protection missing'; END IF; END \$\$;"
    run -f "$ROOT/supabase/migrations/$INTAKE_MIGRATION"
  fi
done

if [ "$applied_fix" -ne 1 ]; then
  echo "FAILED: corrective migration $FIX_MIGRATION was not found."
  exit 1
fi

echo "== after fix: agent ownership"
run -f "$ROOT/supabase/tests/agents_after_fix.sql"
echo "== after fix: intake, consent, suppression"
run -f "$ROOT/supabase/tests/intake_assertions.sql"
echo "INTAKE_SQL_OK"
