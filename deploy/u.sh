#!/bin/bash
set -e
cd /opt/aipoweredsites
echo "=== AI Powered Sites Update ==="
echo "$(date)"

if [ -f .env ]; then set -a; source .env; set +a; fi

if [ ! -f /swapfile ]; then
  echo "--- Adding swap (prevents OOM) ---"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile > /dev/null && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
swapon /swapfile 2>/dev/null || true

echo "--- Pulling latest code ---"
git fetch origin main -q
git reset --hard origin/main -q
echo "Code updated"

echo "--- Running migrations ---"
for f in $(ls deploy/migrations/*.sql 2>/dev/null | sort); do
  echo "  $(basename $f)"
  docker compose exec -T db psql -U "${POSTGRES_USER:-aips}" -d "${POSTGRES_DB:-aipoweredsites}" < "$f" 2>/dev/null || true
done

echo "--- Stopping old container ---"
docker compose stop app && docker compose rm -f app

echo "--- Building (3-5 min) ---"
docker compose build --no-cache app 2>&1 | tail -10
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "BUILD FAILED"
  exit 1
fi

echo "--- Starting ---"
docker compose up -d

echo "--- Waiting ---"
sleep 8

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:80 2>/dev/null || echo "000")
echo "HTTP: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
  echo "UPDATE SUCCESS"
else
  echo "Checking logs..."
  docker compose logs --tail 30 app
fi
