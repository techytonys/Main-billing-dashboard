#!/bin/bash
set -e

APP_DIR="/opt/aipoweredsites"
REPO_URL="https://github.com/techytonys/Main-billing-dashboard.git"

# ---- Colors & Helpers ----
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[1;35m'
BLUE='\033[1;34m'
WHITE='\033[1;37m'
RED='\033[1;31m'
RESET='\033[0m'
CHECK="${GREEN}[done]${RESET}"

progress_bar() {
  local duration=$1
  local steps=30
  local sleep_time=$(echo "$duration / $steps" | bc -l 2>/dev/null || echo "0.1")
  printf "  ${DIM}"
  for ((i=0; i<steps; i++)); do
    printf ">"
    sleep "$sleep_time" 2>/dev/null || sleep 0.1
  done
  printf "${RESET} ${CHECK}\n"
}

step_header() {
  local step=$1
  local total=$2
  local label=$3
  local icon=$4
  echo ""
  echo -e "  ${CYAN}${icon}  ${WHITE}[${step}/${total}]${RESET} ${BOLD}${label}${RESET}"
  echo -e "  ${DIM}---------------------------------------------${RESET}"
}

# ---- Banner ----
clear
echo ""
echo -e "${CYAN}"
echo '      _    ___   ____                              _  '
echo '     / \  |_ _| |  _ \ _____      _____ _ __ ___ | | '
echo '    / _ \  | |  | |_) / _ \ \ /\ / / _ \ '"'"'__/ _ \| | '
echo '   / ___ \ | |  |  __/ (_) \ V  V /  __/ | |  __/|_| '
echo '  /_/   \_\___| |_|   \___/ \_/\_/ \___|_|  \___||_| '
echo ""
echo -e "${RESET}"
echo -e "  ${WHITE}${BOLD}AI Powered Sites ${DIM}- Full Server Deployment${RESET}"
echo -e "  ${DIM}One script. Zero hassle. Let's go.${RESET}"
echo ""
sleep 1

# ---- Root check ----
if [ "$(id -u)" -ne 0 ]; then
  echo -e "  ${RED}ERROR: Run as root (sudo bash install.sh)${RESET}"
  exit 1
fi

# ---- Step 1: System packages ----
export DEBIAN_FRONTEND=noninteractive

step_header 1 8 "Updating system packages" "~"
apt update -qq > /dev/null 2>&1
apt upgrade -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" > /dev/null 2>&1
progress_bar 0.5

# ---- Step 2: Dependencies ----
step_header 2 8 "Installing dependencies" "#"
apt install -y -qq ca-certificates curl gnupg git ufw bc > /dev/null 2>&1
progress_bar 0.5

# ---- Step 3: Docker ----
step_header 3 8 "Setting up Docker" "@"
if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt update -qq > /dev/null 2>&1
  apt install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1
  echo -e "  ${GREEN}Docker installed fresh${RESET}"
else
  echo -e "  ${DIM}Docker already installed, moving on${RESET}"
fi
systemctl enable docker > /dev/null 2>&1
systemctl start docker
progress_bar 0.3

# ---- Step 4: Firewall ----
step_header 4 8 "Configuring firewall" "!"
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
echo -e "  ${DIM}SSH, HTTP, HTTPS allowed${RESET}"
progress_bar 0.2

# ---- Step 5: Clone repo ----
step_header 5 8 "Pulling your code" "+"
if [ -d "$APP_DIR/.git" ]; then
  echo -e "  ${DIM}Repo exists, pulling latest...${RESET}"
  cd "$APP_DIR"
  git pull origin main -q
else
  mkdir -p "$APP_DIR"
  git clone -q "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
progress_bar 0.3

# ---- Step 6: Environment ----
step_header 6 8 "Setting up environment" "%"
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo -e "  ${YELLOW}${BOLD}Quick setup - enter your 4 keys:${RESET}"
  echo ""

  read -sp "  $(echo -e "${MAGENTA}")Admin password: $(echo -e "${RESET}")" ADMIN_PWD
  echo ""
  read -p "$(echo -e "  ${MAGENTA}")Stripe Secret Key: $(echo -e "${RESET}")" STRIPE_SK
  read -p "$(echo -e "  ${MAGENTA}")Stripe Publishable Key: $(echo -e "${RESET}")" STRIPE_PK
  read -p "$(echo -e "  ${MAGENTA}")Resend API Key: $(echo -e "${RESET}")" RESEND_KEY
  echo ""

  cat > "$APP_DIR/.env" << ENVFILE
DOMAIN=aipoweredsites.com
POSTGRES_USER=aips
POSTGRES_PASSWORD=84de28bcec055938a4b83637def758be
POSTGRES_DB=aipoweredsites
SESSION_SECRET=7b06782f45dd45ac378615729094ec23e10dbad48f38474910bf8a79c2219324
ADMIN_EMAIL=anthonyjacksonverizon@gmail.com
ADMIN_PASSWORD=${ADMIN_PWD}
STRIPE_SECRET_KEY=${STRIPE_SK}
STRIPE_PUBLISHABLE_KEY=${STRIPE_PK}
RESEND_API_KEY=${RESEND_KEY}
RESEND_AUDIENCE_ID=f2598d50-ee09-40eb-9939-163ea6e7f938
VAPID_PUBLIC_KEY=BK8LITNbUoKFCIiM7EHrf6CVTCuQnaiF0GtXU7NGzVt20Ykiaau-Iyg5efzglQ-wZKYQ47Da6XtQOnlYLSmEZ7Y
VAPID_PRIVATE_KEY=7JAIKLBBlFOACt9AoAJoe-IApXdfHrzOcFGlZaUcxDQ
VAPID_SUBJECT=mailto:hello@aipoweredsites.com
ENVFILE

  echo -e "  ${GREEN}Environment locked and loaded${RESET}"
else
  echo -e "  ${DIM}.env exists, keeping current values${RESET}"
fi
progress_bar 0.2

# ---- Step 7: Build & Launch ----
step_header 7 8 "Building & launching containers" "*"
cd "$APP_DIR"
echo -e "  ${DIM}This takes a couple minutes on first run...${RESET}"
docker compose up -d --build 2>&1 | tail -5
echo ""
echo -e "  ${DIM}Waiting for database to warm up...${RESET}"
sleep 10
progress_bar 0.5

# ---- Step 8: Database ----
step_header 8 8 "Creating database tables" "="
docker compose exec -T app npx drizzle-kit push 2>&1 | tail -3
progress_bar 0.3

# ---- Finale ----
echo ""
echo ""
echo -e "${GREEN}"
echo '   _____ _    _  _____ _____ ______  _____ _____ '
echo '  / ____| |  | |/ ____/ ____|  ____|/ ____/ ____|'
echo '  | (___ | |  | | |   | |    | |__  | (___| (___ '
echo '   \___ \| |  | | |   | |    |  __|  \___ \\___ \'
echo '   ____) | |__| | |___| |____| |____ ____) |___) |'
echo '  |_____/ \____/ \_____\_____|______|_____/_____/'
echo -e "${RESET}"
echo ""
echo -e "  ${WHITE}${BOLD}Your site is LIVE!${RESET}"
echo ""
echo -e "  ${CYAN}Useful commands:${RESET}"
echo -e "    ${DIM}Check status:${RESET}  docker compose ps"
echo -e "    ${DIM}View logs:${RESET}     docker compose logs -f app"
echo -e "    ${DIM}Update later:${RESET}  bash $APP_DIR/deploy/update.sh"
echo ""
echo -e "  ${MAGENTA}${BOLD}Congrats on the milestone!${RESET}"
echo ""
