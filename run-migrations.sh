#!/bin/bash
# Quick Start: Run all migrations in sequence

set -e

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set!"
    echo "Run: export DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "🗄️  Running all migrations..."
echo "================================"

for migration in migrations/00*.sql; do
    echo "▶️  Running $(basename $migration)..."
    psql "$DATABASE_URL" -f "$migration" > /dev/null 2>&1 && echo "✅ $(basename $migration)" || echo "❌ Failed: $migration"
done

echo ""
echo "✅ All migrations completed!"
echo ""
echo "Verifying tables..."
psql "$DATABASE_URL" -tc "SELECT tablename FROM pg_tables WHERE schemaname='public';" | awk '{print "  - " $1}' | grep -v '^  - $'

echo ""
echo "Next: Run 'pnpm --filter @workspace/scripts run seed' to add demo data"
