#!/bin/bash
cd /opt/aipoweredsites
if [ -f .env ]; then set -a; source .env; set +a; fi
git pull origin main
for f in deploy/migrations/*.sql; do
  [ -f "$f" ] && docker compose exec -T db psql -U "${POSTGRES_USER:-aips}" -d "${POSTGRES_DB:-aipoweredsites}" -f "/dev/stdin" < "$f" 2>/dev/null
done
docker compose stop app && docker compose rm -f app
docker compose build --no-cache app
docker compose up -d
sleep 5
echo "Done! HTTP: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:80)"
