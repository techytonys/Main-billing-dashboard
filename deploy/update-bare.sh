#!/bin/bash
set -e
APP_DIR="/opt/aipoweredsites"
cd "$APP_DIR"
echo "=== AI Powered Sites Update (Bare Metal) ==="
echo "$(date)"

if [ -f .env ]; then set -a; source .env; set +a; fi

swapon /swapfile 2>/dev/null || true

echo "--- Pulling latest code ---"
git fetch origin main -q
git reset --hard origin/main -q
echo "Code updated"

echo "--- Running migrations ---"
DB_PASS=$(grep "^POSTGRES_PASSWORD=" .env 2>/dev/null | cut -d= -f2-)
for f in $(ls deploy/migrations/*.sql 2>/dev/null | sort); do
  echo "  $(basename $f)"
  PGPASSWORD="${DB_PASS}" psql -U aips -h localhost -d aipoweredsites < "$f" > /dev/null 2>&1 || true
done

echo "--- Installing dependencies ---"
npm ci --legacy-peer-deps 2>&1 | tail -3

echo "--- Building ---"
npm run build 2>&1 | tail -5
if [ $? -ne 0 ]; then
  echo "BUILD FAILED"
  exit 1
fi

echo "--- Restarting ---"
systemctl restart aipoweredsites

sleep 5

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:80 2>/dev/null || echo "000")
echo "HTTP: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
  echo "UPDATE SUCCESS"
else
  echo "Checking logs..."
  journalctl -u aipoweredsites --no-pager -n 30
fi
