#!/bin/bash
set -e

APP_DIR="/opt/aipoweredsites"

BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
WHITE='\033[1;37m'
RESET='\033[0m'
CHECK="${GREEN}[done]${RESET}"

spin() {
  local pid=$1
  local chars='|/-\'
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${DIM}%s${RESET} " "${chars:i++%4:1}"
    sleep 0.15
  done
  printf "\r"
}

echo ""
echo -e "${CYAN}${BOLD}"
echo '  ~ Updating AI Powered Sites ~'
echo -e "${RESET}"
sleep 0.3

cd "$APP_DIR"

echo -e "  ${WHITE}[1/4]${RESET} ${BOLD}Pulling latest code${RESET}"
git pull origin main -q
echo -e "        ${CHECK}"
echo ""

echo -e "  ${WHITE}[2/4]${RESET} ${BOLD}Rebuilding app${RESET}"
echo -e "  ${DIM}(this may take a minute)${RESET}"
docker compose build --no-cache app -q 2>&1
echo -e "        ${CHECK}"
echo ""

echo -e "  ${WHITE}[3/4]${RESET} ${BOLD}Restarting services${RESET}"
docker compose up -d --force-recreate app > /dev/null 2>&1
sleep 5
echo -e "        ${CHECK}"
echo ""

echo -e "  ${WHITE}[4/4]${RESET} ${BOLD}Syncing database${RESET}"
docker compose exec -T app ./node_modules/.bin/drizzle-kit push 2>&1 | tail -2
echo -e "        ${CHECK}"

echo ""
echo -e "  ${GREEN}${BOLD}Updated!${RESET} Your site is live with the latest changes."
echo ""
echo -e "  ${DIM}View logs:  docker compose logs -f app${RESET}"
echo ""
