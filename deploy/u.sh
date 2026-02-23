#!/bin/bash
set -e
cd /opt/aipoweredsites
echo "=== AI Powered Sites Deploy ==="
echo "$(date)"

if [ -f .env ]; then set -a; source .env; set +a; fi

echo "--- Pulling latest code ---"
git pull origin main

echo "--- Running migrations ---"
for f in deploy/migrations/*.sql; do
  [ -f "$f" ] && echo "  Running: $f" && docker compose exec -T db psql -U "${POSTGRES_USER:-aips}" -d "${POSTGRES_DB:-aipoweredsites}" -f "/dev/stdin" < "$f" 2>/dev/null || true
done

echo "--- Stopping old container ---"
docker compose stop app && docker compose rm -f app

echo "--- Building new image (this takes a few minutes) ---"
docker compose build --no-cache app 2>&1 | tee /tmp/docker-build.log
BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
  echo "ERROR: Docker build failed! Check /tmp/docker-build.log"
  exit 1
fi

echo "--- Starting containers ---"
docker compose up -d

echo "--- Waiting for startup ---"
sleep 8

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:80)
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
  echo "Deploy SUCCESS!"
else
  echo "WARNING: HTTP $HTTP_CODE - checking container logs..."
  docker compose logs --tail 30 app
fi

echo "=== Deploy complete ==="
