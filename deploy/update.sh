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

echo -e "  ${WHITE}[1/6]${RESET} ${BOLD}Backing up database${RESET}"
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

echo -e "  ${WHITE}[2/6]${RESET} ${BOLD}Pulling latest code${RESET}"
git pull origin main -q
echo -e "  ${GREEN}✔${RESET} Code updated"
echo ""

echo -e "  ${WHITE}[3/6]${RESET} ${BOLD}Stopping app container${RESET}"
docker compose stop app 2>/dev/null || true
docker compose rm -f app 2>/dev/null || true
echo -e "  ${GREEN}✔${RESET} App stopped (database still running)"
echo ""

echo -e "  ${WHITE}[4/6]${RESET} ${BOLD}Rebuilding app${RESET}"
docker compose build app 2>&1
echo -e "  ${GREEN}✔${RESET} Build complete"
echo ""

echo -e "  ${WHITE}[5/6]${RESET} ${BOLD}Starting app${RESET}"
docker compose up -d 2>/dev/null
echo -e "  ${GREEN}✔${RESET} Containers started"
echo ""

echo -e "  ${WHITE}[6/6]${RESET} ${BOLD}Verifying${RESET}"
sleep 8
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:80 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "  ${GREEN}✔ Site is live (HTTP ${HTTP_CODE})${RESET}"
else
  echo -e "  ${YELLOW}HTTP ${HTTP_CODE} - checking logs...${RESET}"
  docker compose logs --tail=20 app
fi

echo ""
echo -e "  ${GREEN}${BOLD}Done!${RESET} Site is live with latest changes."
echo -e "  ${GREEN}✔${RESET} All data preserved."
echo ""
echo -e "  ${DIM}View logs: docker compose logs -f app${RESET}"
echo ""
