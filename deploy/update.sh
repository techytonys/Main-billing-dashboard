#!/bin/bash
set -e

APP_DIR="/opt/aipoweredsites"

echo "============================================"
echo "  AI Powered Sites - Applying Updates"
echo "============================================"
echo ""

cd "$APP_DIR"

echo "[1/4] Pulling latest changes..."
git pull origin main

echo "[2/4] Rebuilding containers..."
docker compose build --no-cache app

echo "[3/4] Restarting services..."
docker compose up -d --force-recreate app

echo "[4/4] Pushing any database changes..."
docker compose exec -T app npx drizzle-kit push

echo ""
echo "Update complete! App is live."
echo "Check status: docker compose ps"
echo "View logs:    docker compose logs -f app"
