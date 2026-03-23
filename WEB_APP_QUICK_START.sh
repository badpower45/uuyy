#!/bin/bash
# Quick Start: Build and deploy web app

echo "🚀 Driver Master - Web App Quick Start"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "artifacts/mobile/package.json" ]; then
  echo "❌ Error: Must run from Driver-Master root directory"
  exit 1
fi

echo "📋 Available Commands:"
echo ""
echo "1️⃣  Development (with hot reload):"
echo "   cd artifacts/mobile && pnpm web"
echo ""
echo "2️⃣  Build for production:"
echo "   cd artifacts/mobile && pnpm web:build"
echo ""
echo "3️⃣  Preview production build:"
echo "   cd artifacts/mobile && pnpm web:preview"
echo ""
echo "4️⃣  Deploy to Vercel:"
echo "   vercel --prod"
echo ""
echo "======================================"
echo ""
echo "📚 For detailed guide, see:"
echo "   - WEB_APP_DEPLOYMENT.md (نشر التطبيق)"
echo "   - artifacts/mobile/WEB_BUILD_GUIDE.md (دليل البناء)"
echo ""
