#!/bin/bash

# Web Build Script for Driver Master Mobile App
# Builds the mobile app as a web application for browser deployment

set -e

echo "📦 Building Driver Master Web App..."
echo "===================================="

# Change to mobile directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📥 Installing dependencies..."
  pnpm install
fi

# Export web build
echo "🌐 Exporting to web..."
pnpm exec expo export --platform web --output-dir web-dist

# Check if build succeeded
if [ -d "web-dist" ]; then
  echo ""
  echo "✅ Build completed successfully!"
  echo ""
  echo "📁 Output directory: web-dist/"
  echo ""
  echo "To serve locally:"
  echo "  npx serve web-dist"
  echo ""
  echo "To deploy to Vercel:"
  echo "  vercel --prod"
  echo ""
  ls -la web-dist/ | head -20
else
  echo "❌ Build failed!"
  exit 1
fi
