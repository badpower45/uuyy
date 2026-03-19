#!/bin/bash
# Backend Local Development Setup Script

set -e

echo "🚀 Driver-Master Backend Setup"
echo "================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "✅ .env.local created. Please update DATABASE_URL."
    exit 1
fi

# Load .env.local
export $(cat .env.local | grep -v '^#' | xargs)

echo "📦 Installing dependencies..."
pnpm install

echo "🔍 Running typecheck..."
pnpm run typecheck

echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  export \$(cat .env.local | grep -v '^#' | xargs)"
echo "  pnpm --filter @workspace/api-server run dev"
echo ""
echo "To run migrations:"
echo "  pnpm --filter @workspace/db run push"
echo ""
echo "To seed demo data:"
echo "  pnpm --filter @workspace/scripts run seed"
