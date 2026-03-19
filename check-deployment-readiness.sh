#!/bin/bash
# Deployment Readiness Check for Driver-Master Backend

set -e

echo "🚀 Driver-Master Backend - Deployment Readiness Check"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

# 1. Check Node/pnpm versions
echo "📦 Checking Package Manager..."
node_version=$(node -v)
pnpm_version=$(pnpm -v)
echo "  Node: $node_version"
echo "  pnpm: $pnpm_version"
echo ""

# 2. Check build
echo "🔨 Checking Build Artifacts..."
if [ -f "artifacts/api-server/dist/index.cjs" ]; then
    size=$(du -h artifacts/api-server/dist/index.cjs | cut -f1)
    check_status 0 "Production bundle exists ($size)"
else
    check_status 1 "Production bundle missing - run: pnpm --filter @workspace/api-server run build"
    exit 1
fi
echo ""

# 3. Check migration files
echo "📊 Checking Database Migrations..."
for file in migrations/00[1-5]_*.sql; do
    if [ -f "$file" ]; then
        check_status 0 "$(basename $file) found"
    fi
done

if [ ! -f "migrations/001_create_drivers.sql" ] || [ ! -f "migrations/002_create_orders.sql" ] || [ ! -f "migrations/003_create_driver_locations.sql" ] || [ ! -f "migrations/004_create_earnings.sql" ] || [ ! -f "migrations/005_create_tracking_sessions.sql" ]; then
    check_status 1 "Not all required migrations found"
    exit 1
else
    check_status 0 "All 5 migrations present"
fi
echo ""

# 4. Check Supabase connection
echo "☁️  Checking Supabase Integration..."
if grep -q "avoeyxfwwazkvbtdypxc" <<< "$(supabase projects list 2>/dev/null || echo '')"; then
    check_status 0 "Supabase project linked (avoeyxfwwazkvbtdypxc)"
else
    check_status 1 "Supabase project not linked"
    echo "  Run: supabase link --project-ref avoeyxfwwazkvbtdypxc"
    exit 1
fi
echo ""

# 5. Check environment
echo "🔐 Checking Environment Configuration..."
if [ -f ".env" ]; then
    if grep -q "^DATABASE_URL=" .env; then
        if grep -q "PASSWORD_HERE" .env; then
            check_status 1 "DATABASE_URL configured but placeholder password detected"
            echo "  → Get password from: https://app.supabase.com/projects/avoeyxfwwazkvbtdypxc/settings/database"
        else
            check_status 0 "DATABASE_URL configured"
        fi
    else
        check_status 1 "DATABASE_URL not found in .env"
    fi
else
    check_status 1 ".env file missing"
fi
echo ""

# 6. Check configuration files
echo "⚙️  Checking Configuration Files..."
[ -f "vercel.json" ] && check_status 0 "vercel.json exists"
[ -f "tsconfig.json" ] && check_status 0 "tsconfig.json exists"
[ -f "pnpm-workspace.yaml" ] && check_status 0 "pnpm-workspace.yaml exists"
echo ""

# 7. Check Git status
echo "📝 Checking Git Status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    check_status 0 "Git repository initialized"
    changed_files=$(git status --porcelain | wc -l)
    if [ $changed_files -gt 0 ]; then
        echo "  ⚠️  $changed_files files changed (uncommitted)"
    else
        check_status 0 "All changes committed"
    fi
else
    check_status 1 "Not a git repository"
fi
echo ""

# Summary
echo "=================================================="
echo "✅ Deployment Checklist Summary:"
echo ""
echo "Before deploying to Vercel:"
echo "1. [ ] Get DATABASE_URL from Supabase dashboard"
echo "2. [ ] Update .env with actual password"
echo "3. [ ] Run migrations: ./run-migrations.sh"
echo "4. [ ] Test locally: pnpm --filter @workspace/api-server run dev"
echo "5. [ ] Push changes to GitHub: git push origin main"
echo ""
echo "Then deploy to Vercel:"
echo "6. [ ] Import from GitHub to Vercel"
echo "7. [ ] Add environment variables"
echo "8. [ ] Deploy and verify /api/health"
echo ""
