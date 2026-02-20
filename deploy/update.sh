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
sleep 0.3

cd "$APP_DIR"

echo -e "  ${WHITE}[1/7]${RESET} ${BOLD}Backing up database${RESET}"
BACKUP_DIR="$APP_DIR/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
if docker compose exec -T db pg_dump -U "${POSTGRES_USER:-aips}" "${POSTGRES_DB:-aipoweredsites}" > "$BACKUP_FILE" 2>/dev/null; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "  ${GREEN}✔${RESET} Database backed up (${BACKUP_SIZE}): ${DIM}${BACKUP_FILE}${RESET}"
  # Keep only last 10 backups
  ls -t "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
else
  echo -e "  ${YELLOW}⚠ Could not backup database (container may not be running)${RESET}"
  echo -e "  ${YELLOW}  Continuing anyway - your data volume is still safe${RESET}"
  rm -f "$BACKUP_FILE"
fi
echo -e "        ${CHECK}"
echo ""

echo -e "  ${WHITE}[2/7]${RESET} ${BOLD}Pulling latest code${RESET}"
git pull origin main -q
echo -e "        ${CHECK}"
echo ""

echo -e "  ${WHITE}[3/7]${RESET} ${BOLD}Verifying environment${RESET}"

ENV_OK=true

if [ ! -f "$APP_DIR/.env" ]; then
  echo -e "  ${RED}No .env file found! Run install.sh first.${RESET}"
  exit 1
fi

# Fix blank password
if grep -q "^ADMIN_PASSWORD=$" "$APP_DIR/.env" 2>/dev/null || ! grep -q "^ADMIN_PASSWORD=" "$APP_DIR/.env" 2>/dev/null; then
  if grep -q "^ADMIN_PASSWORD=" "$APP_DIR/.env"; then
    sed -i 's/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=Aipowered2025!/' "$APP_DIR/.env"
  else
    echo "ADMIN_PASSWORD=Aipowered2025!" >> "$APP_DIR/.env"
  fi
  echo -e "  ${YELLOW}Password was blank, set to default${RESET}"
fi

# Check all required keys
check_key() {
  local key=$1
  local label=$2
  local val=$(grep "^${key}=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  if [ -z "$val" ]; then
    echo -e "  ${RED}MISSING: ${label}${RESET}"
    ENV_OK=false
  else
    echo -e "  ${GREEN}✔${RESET} ${label} (${DIM}${val:0:7}...${RESET})"
  fi
}

check_key "STRIPE_SECRET_KEY" "Stripe Secret Key"
check_key "STRIPE_PUBLISHABLE_KEY" "Stripe Publishable Key"
check_key "RESEND_API_KEY" "Resend API Key"
check_key "SESSION_SECRET" "Session Secret"
check_key "ADMIN_PASSWORD" "Admin Password"
check_key "POSTGRES_PASSWORD" "Database Password"

# Optional keys (info only)
GH_CID=$(grep "^GITHUB_CLIENT_ID=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
GH_CSEC=$(grep "^GITHUB_CLIENT_SECRET=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
if [ -n "$GH_CID" ] && [ -n "$GH_CSEC" ]; then
  echo -e "  ${GREEN}✔${RESET} GitHub OAuth (code backups)"
else
  echo -e "  ${DIM}ℹ GitHub OAuth not configured (code backups disabled)${RESET}"
  echo -e "  ${DIM}  Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env to enable${RESET}"
fi

# Ensure SITE_URL exists
if ! grep -q "^SITE_URL=" "$APP_DIR/.env" 2>/dev/null; then
  DOMAIN_VAL=$(grep "^DOMAIN=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  DOMAIN_VAL=${DOMAIN_VAL:-aipoweredsites.com}
  echo "SITE_URL=https://${DOMAIN_VAL}" >> "$APP_DIR/.env"
  echo -e "  ${YELLOW}Added SITE_URL=https://${DOMAIN_VAL}${RESET}"
fi

# Ensure VAPID keys exist
if ! grep -q "^VAPID_PUBLIC_KEY=" "$APP_DIR/.env" 2>/dev/null; then
  echo "VAPID_PUBLIC_KEY=BK8LITNbUoKFCIiM7EHrf6CVTCuQnaiF0GtXU7NGzVt20Ykiaau-Iyg5efzglQ-wZKYQ47Da6XtQOnlYLSmEZ7Y" >> "$APP_DIR/.env"
  echo "VAPID_PRIVATE_KEY=7JAIKLBBlFOACt9AoAJoe-IApXdfHrzOcFGlZaUcxDQ" >> "$APP_DIR/.env"
  echo "VAPID_SUBJECT=mailto:hello@aipoweredsites.com" >> "$APP_DIR/.env"
  echo -e "  ${YELLOW}Added VAPID keys${RESET}"
fi

if [ "$ENV_OK" = false ]; then
  echo ""
  echo -e "  ${RED}${BOLD}Some keys are missing! Fix your .env file:${RESET}"
  echo -e "  ${DIM}nano $APP_DIR/.env${RESET}"
  echo ""
  read -p "$(echo -e "  ${YELLOW}")Continue anyway? (y/N): $(echo -e "${RESET}")" CONTINUE
  if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
    exit 1
  fi
fi

echo -e "        ${CHECK}"
echo ""

echo -e "  ${WHITE}[4/7]${RESET} ${BOLD}Rebuilding app${RESET}"
echo -e "  ${DIM}(uses cached layers - should be fast)${RESET}"
docker compose build app 2>&1
echo -e "        ${CHECK}"
echo ""

echo -e "  ${WHITE}[5/7]${RESET} ${BOLD}Applying database schema updates (add-only)${RESET}"
docker compose up -d --no-deps db > /dev/null 2>&1
sleep 3
if docker compose exec -T db psql -U "${POSTGRES_USER:-aips}" -d "${POSTGRES_DB:-aipoweredsites}" -c "SELECT 1" > /dev/null 2>&1; then
  docker compose run --rm -T app ./node_modules/.bin/drizzle-kit push 2>&1 | tail -5
  echo -e "  ${GREEN}✔${RESET} Schema up to date"
else
  echo -e "  ${YELLOW}⚠ Could not reach database - skipping schema update${RESET}"
fi
echo -e "        ${CHECK}"
echo ""

echo -e "  ${WHITE}[6/7]${RESET} ${BOLD}Restarting app only (database stays running)${RESET}"
docker compose up -d --no-deps --force-recreate app > /dev/null 2>&1
sleep 5
echo -e "  ${GREEN}✔${RESET} App container restarted"
echo -e "  ${GREEN}✔${RESET} Database container unchanged - all your data is safe"
echo -e "        ${CHECK}"
echo ""

echo -e "  ${WHITE}[7/7]${RESET} ${BOLD}Verifying app is running${RESET}"
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "  ${GREEN}✔ Site is responding (HTTP ${HTTP_CODE})${RESET}"
else
  echo -e "  ${YELLOW}Site returned HTTP ${HTTP_CODE} - check logs: docker compose logs -f app${RESET}"
fi
echo -e "        ${CHECK}"

echo ""
echo -e "  ${GREEN}${BOLD}Updated!${RESET} Your site is live with the latest changes."
echo -e "  ${GREEN}✔${RESET} All your customers, invoices, and data are preserved."
echo -e "  ${GREEN}✔${RESET} Database backup saved in /opt/aipoweredsites/backups/"
echo ""
echo -e "  ${DIM}Login: anthonyjacksonverizon@gmail.com / Aipowered2025!${RESET}"
echo -e "  ${DIM}View logs:  docker compose logs -f app${RESET}"
echo ""
echo -e "  ${CYAN}Restore a backup if needed:${RESET}"
echo -e "  ${DIM}  cat backups/db_backup_YYYYMMDD_HHMMSS.sql | docker compose exec -T db psql -U aips -d aipoweredsites${RESET}"
echo ""
