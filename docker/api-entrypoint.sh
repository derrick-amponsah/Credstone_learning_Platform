#!/bin/sh
# ─────────────────────────────────────────────────────────
# Credstone Learning API — Docker entrypoint
# Waits for PostgreSQL to be ready, then runs migrations
# (idempotent) and starts the server.
# ─────────────────────────────────────────────────────────

set -e

echo "⏳ Waiting for PostgreSQL …"
until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-credstone}" -q; do
  sleep 1
done
echo "✅ PostgreSQL is ready."

echo "📦 Running database schema migration …"
node dist/scripts/migrate.js
echo "✅ Migration complete."

echo "🚀 Starting Credstone API …"
exec node dist/server.js
