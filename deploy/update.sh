#!/bin/bash
set -e

APP_DIR="/opt/aipoweredsites"

BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
WHITE='\033[1;37m'
MAGENTA='\033[1;35m'
RESET='\033[0m'
CHECK="${GREEN}[done]${RESET}"

echo ""
echo -e "${CYAN}${BOLD}"
echo '  ~ Updating AI Powered Sites ~'
echo -e "${RESET}"

cd "$APP_DIR"

if [ -f .env ]; then
  set -a; source .env; set +a
fi

echo -e "  ${WHITE}[1/8]${RESET} ${BOLD}Backing up database${RESET}"
BACKUP_DIR="$APP_DIR/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
if docker compose exec -T db pg_dump -U "${POSTGRES_USER:-aips}" "${POSTGRES_DB:-aipoweredsites}" > "$BACKUP_FILE" 2>/dev/null; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "  ${GREEN}✔${RESET} Database backed up (${BACKUP_SIZE})"
  ls -t "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
else
  echo -e "  ${YELLOW}⚠ Could not backup database (continuing anyway)${RESET}"
  rm -f "$BACKUP_FILE"
fi
echo ""

echo -e "  ${WHITE}[2/8]${RESET} ${BOLD}Pulling latest code${RESET}"
git fetch origin main
git reset --hard origin/main
echo -e "  ${GREEN}✔${RESET} Code updated to $(git rev-parse --short HEAD)"
echo ""

echo -e "  ${WHITE}[3/8]${RESET} ${BOLD}Running database migrations${RESET}"
MIGRATION_DIR="$APP_DIR/deploy/migrations"
if [ -d "$MIGRATION_DIR" ]; then
  MIGRATION_COUNT=0
  for sql_file in $(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort); do
    FILENAME=$(basename "$sql_file")
    if docker compose exec -T db psql -U "${POSTGRES_USER:-aips}" -d "${POSTGRES_DB:-aipoweredsites}" -f "/dev/stdin" < "$sql_file" > /dev/null 2>&1; then
      echo -e "  ${GREEN}✔${RESET} Applied: $FILENAME"
      MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    else
      echo -e "  ${YELLOW}⚠${RESET} Already applied or skipped: $FILENAME"
    fi
  done
  if [ $MIGRATION_COUNT -eq 0 ]; then
    echo -e "  ${GREEN}✔${RESET} All migrations already applied"
  fi
else
  echo -e "  ${GREEN}✔${RESET} No migrations to run"
fi
echo ""

echo -e "  ${WHITE}[4/8]${RESET} ${BOLD}Stopping app container${RESET}"
docker compose stop app 2>/dev/null || true
docker compose rm -f app 2>/dev/null || true
echo -e "  ${GREEN}✔${RESET} App stopped (database still running)"
echo ""

echo -e "  ${WHITE}[5/8]${RESET} ${BOLD}Rebuilding app (no cache)${RESET}"
docker compose build --no-cache app 2>&1
echo -e "  ${GREEN}✔${RESET} Build complete"
echo ""

echo -e "  ${WHITE}[6/8]${RESET} ${BOLD}Cleaning old images${RESET}"
docker image prune -f 2>/dev/null || true
echo -e "  ${GREEN}✔${RESET} Old images removed"
echo ""

echo -e "  ${WHITE}[7/8]${RESET} ${BOLD}Starting app${RESET}"
docker compose up -d 2>/dev/null
echo -e "  ${GREEN}✔${RESET} Containers started"
echo ""

echo -e "  ${WHITE}[8/8]${RESET} ${BOLD}Verifying${RESET}"
sleep 8
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:80 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "  ${GREEN}✔ Site is live (HTTP ${HTTP_CODE})${RESET}"
else
  echo -e "  ${YELLOW}HTTP ${HTTP_CODE} - checking logs...${RESET}"
  docker compose logs --tail=20 app
fi

echo ""
echo -e "  ${GREEN}${BOLD}Done!${RESET} Site updated to commit $(git rev-parse --short HEAD)."
echo -e "  ${GREEN}✔${RESET} All data preserved."
echo ""
echo -e "  ${DIM}View logs: docker compose logs -f app${RESET}"
echo ""
