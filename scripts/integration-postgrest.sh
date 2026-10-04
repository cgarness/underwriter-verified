#!/usr/bin/env bash
# Isolated integration environment: disposable local PostgreSQL + a real PostgREST
# process, so the intake RPC, RLS, grants, and the inbox cursor filter are exercised
# over HTTP exactly as the hosted project would serve them.
#
# Local only. The database URI is hard-coded to 127.0.0.1 and the script refuses
# to run if any remote PostgreSQL target is configured in the environment.
#
# Usage: bash scripts/integration-postgrest.sh [--keep]
#   --keep  leave PostgREST running (prints its PID) for browser checks.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_NAME="ffl_integration_test"
PROXY_PORT="${PROXY_PORT:-3001}"
PGRST_PORT="${PGRST_PORT:-3002}"
POSTGREST_BIN="${POSTGREST_BIN:-postgrest}"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

for var in PGHOST PGHOSTADDR PGPORT PGUSER PGPASSWORD PGDATABASE PGSERVICE DATABASE_URL SUPABASE_DB_URL POSTGRES_URL; do
  if [ -n "${!var:-}" ]; then
    echo "REFUSED: $var is set. This harness only runs against a local disposable database."
    exit 3
  fi
done

if ! command -v "$POSTGREST_BIN" >/dev/null 2>&1; then
  echo "BLOCKED: postgrest binary not found (set POSTGREST_BIN)."
  exit 2
fi
if ! sudo -u postgres psql -h /var/run/postgresql -c "SELECT 1" >/dev/null 2>&1; then
  echo "BLOCKED: no local PostgreSQL server on /var/run/postgresql."
  exit 2
fi

PSQL=(sudo -u postgres psql -h /var/run/postgresql -v ON_ERROR_STOP=1 -q)
run() { "${PSQL[@]}" -d "$DB_NAME" "$@"; }

pkill -f "postgrest /tmp/ffl-postgrest.conf" 2>/dev/null || true
pkill -f "scripts/integration-proxy.mjs" 2>/dev/null || true
sudo -u postgres dropdb -h /var/run/postgresql --if-exists "$DB_NAME"
sudo -u postgres createdb -h /var/run/postgresql "$DB_NAME"

run -f "$ROOT/supabase/tests/harness_bootstrap.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  # Do not swallow SQL errors: a failed migration must fail this integration run.
  run -f "$migration"
done
run -f "$ROOT/supabase/tests/integration_seed.sql"

# Local-only login role for PostgREST. The password never leaves this machine.
AUTH_PW="local-only-$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"
run -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator NOINHERIT LOGIN; END IF; END \$\$;"
run -c "ALTER ROLE authenticator WITH LOGIN PASSWORD '$AUTH_PW';"
run -c "GRANT anon, authenticated, service_role TO authenticator;"

JWT_SECRET="$(head -c 48 /dev/urandom | od -An -tx1 | tr -d ' \n')"
cat > /tmp/ffl-postgrest.conf <<EOF
db-uri = "postgres://authenticator:${AUTH_PW}@127.0.0.1:5432/${DB_NAME}"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "${JWT_SECRET}"
server-host = "127.0.0.1"
server-port = ${PGRST_PORT}
log-level = "error"
EOF
chmod 600 /tmp/ffl-postgrest.conf

"$POSTGREST_BIN" /tmp/ffl-postgrest.conf >/tmp/ffl-postgrest.log 2>&1 &
PGRST_PID=$!
PROXY_PORT="$PROXY_PORT" PGRST_PORT="$PGRST_PORT" node "$ROOT/scripts/integration-proxy.mjs" >/tmp/ffl-proxy.log 2>&1 &
PROXY_PID=$!

# supabase-js calls <url>/rest/v1/...; the proxy strips that prefix for PostgREST.
export POSTGREST_URL="http://127.0.0.1:${PROXY_PORT}"
export PGRST_JWT_SECRET="$JWT_SECRET"
eval "$(node "$ROOT/scripts/integration-jwt.mjs")"

for _ in $(seq 1 50); do
  if curl -fs -H "Authorization: Bearer $JWT_ANON" "$POSTGREST_URL/rest/v1/agents?select=id&limit=1" >/dev/null 2>&1; then break; fi
  sleep 0.2
done

cat > /tmp/ffl-integration.env <<EOF
POSTGREST_URL=$POSTGREST_URL
JWT_ANON=$JWT_ANON
JWT_OWNER_A=$JWT_OWNER_A
JWT_OWNER_B=$JWT_OWNER_B
JWT_SERVICE=$JWT_SERVICE
PGRST_PID=$PGRST_PID
PROXY_PID=$PROXY_PID
EOF
chmod 600 /tmp/ffl-integration.env

node "$ROOT/scripts/integration-api-checks.mjs"

if [ "$KEEP" -eq 1 ]; then
  echo "PostgREST (pid $PGRST_PID) and proxy (pid $PROXY_PID) left running. Env: /tmp/ffl-integration.env"
else
  kill "$PGRST_PID" "$PROXY_PID" 2>/dev/null || true
fi
echo "INTEGRATION_OK"
