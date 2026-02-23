#!/bin/bash
set -e

APP_DIR="/opt/aipoweredsites"
REPO_URL="https://github.com/techytonys/billing-hub.git"
ENV_BACKUP="/root/.aips_env_backup"

BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
WHITE='\033[1;37m'
RED='\033[1;31m'
RESET='\033[0m'

ok()   { echo -e "  ${GREEN}done${RESET}"; }
fail() { echo -e "  ${RED}FAILED: $1${RESET}"; exit 1; }
step() { echo ""; echo -e "  ${CYAN}[$1/$TOTAL]${RESET} ${BOLD}$2${RESET}"; }

if [ "$(id -u)" -ne 0 ]; then
  echo -e "  ${RED}Run as root: sudo bash deploy/deploy.sh${RESET}"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

# IMMEDIATELY save .env to a safe location OUTSIDE the repo before anything else
if [ -f "$APP_DIR/.env" ]; then
  cp -f "$APP_DIR/.env" "$ENV_BACKUP"
fi

IS_UPDATE=false
if [ -f "$ENV_BACKUP" ] && [ -f "$APP_DIR/docker-compose.yml" ]; then
  IS_UPDATE=true
fi

echo ""
echo -e "${CYAN}${BOLD}"
echo '      _    ___   ____                              _  '
echo '     / \  |_ _| |  _ \ _____      _____ _ __ ___ | | '
echo '    / _ \  | |  | |_) / _ \ \ /\ / / _ \'"'"'__/ _ \| | '
echo '   / ___ \ | |  |  __/ (_) \ V  V /  __/ | |  __/|_| '
echo '  /_/   \_\___| |_|   \___/ \_/\_/ \___|_|  \___||_| '
echo -e "${RESET}"

if $IS_UPDATE; then
  echo -e "  ${WHITE}${BOLD}Updating AI Powered Sites${RESET}"
  echo -e "  ${DIM}Pull latest code → Rebuild → Restart (zero prompts)${RESET}"
  TOTAL=7
else
  echo -e "  ${WHITE}${BOLD}AI Powered Sites - Full Deploy + Security Hardening${RESET}"
  echo -e "  ${DIM}Docker + Caddy + Fail2Ban + Auto Security Updates${RESET}"
  TOTAL=12
fi
echo ""

if $IS_UPDATE; then

  cd "$APP_DIR"
  set -a; source "$ENV_BACKUP"; set +a

  step 1 "Backing up database"
  BACKUP_DIR="$APP_DIR/backups"
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql"
  if docker compose exec -T db pg_dump -U "${POSTGRES_USER:-aips}" "${POSTGRES_DB:-aipoweredsites}" > "$BACKUP_FILE" 2>/dev/null; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "  ${DIM}Backed up (${BACKUP_SIZE})${RESET}"
    ls -t "$BACKUP_DIR"/db_*.sql 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
  else
    echo -e "  ${YELLOW}Could not backup (continuing)${RESET}"
    rm -f "$BACKUP_FILE"
  fi
  ok

  step 2 "Pulling latest code"
  git fetch origin main -q
  git reset --hard origin/main -q
  cp -f "$ENV_BACKUP" "$APP_DIR/.env"
  COMMIT=$(git rev-parse --short HEAD)
  echo -e "  ${DIM}Now at commit ${COMMIT}${RESET}"
  ok

  step 3 "Running migrations"
  for f in $(ls deploy/migrations/*.sql 2>/dev/null | sort); do
    echo -e "  ${DIM}$(basename $f)${RESET}"
    docker compose exec -T db psql -U "${POSTGRES_USER:-aips}" -d "${POSTGRES_DB:-aipoweredsites}" < "$f" > /dev/null 2>&1 || true
  done
  ok

  step 4 "Stopping app"
  docker compose stop app 2>/dev/null || true
  docker compose rm -f app 2>/dev/null || true
  echo -e "  ${DIM}Database still running${RESET}"
  ok

  step 5 "Rebuilding (3-5 min)"
  docker compose build --no-cache app 2>&1 | tail -5
  BUILD_EXIT=${PIPESTATUS[0]}
  if [ $BUILD_EXIT -ne 0 ]; then
    fail "Docker build failed"
  fi
  ok

  step 6 "Starting"
  docker compose up -d
  docker image prune -f > /dev/null 2>&1 || true
  ok

  step 7 "Health check"
  sleep 8
  APP_READY=0
  for i in $(seq 1 10); do
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:80 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
      APP_READY=1
      break
    fi
    echo -e "  ${DIM}Waiting (attempt $i)...${RESET}"
    sleep 5
  done
  if [ $APP_READY -eq 1 ]; then
    echo -e "  ${GREEN}${BOLD}Site is LIVE (HTTP 200)${RESET}"
  else
    echo -e "  ${YELLOW}HTTP ${HTTP_CODE} - checking logs...${RESET}"
    docker compose logs --tail=20 app
  fi
  ok

  echo ""
  echo -e "  ${GREEN}${BOLD}Update complete!${RESET} Commit: ${COMMIT}"
  echo -e "  ${DIM}View logs: docker compose logs -f app${RESET}"
  echo ""

else

  step 1 "System packages & updates"
  apt update -qq > /dev/null 2>&1
  apt upgrade -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" > /dev/null 2>&1
  apt install -y -qq ca-certificates curl gnupg git ufw bc > /dev/null 2>&1
  ok

  step 2 "Docker"
  if ! command -v docker &> /dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update -qq > /dev/null 2>&1
    apt install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1
    echo -e "  ${DIM}Docker installed fresh${RESET}"
  else
    echo -e "  ${DIM}Docker already installed${RESET}"
  fi
  systemctl enable docker > /dev/null 2>&1
  systemctl start docker
  ok

  step 3 "Swap space (prevents build OOM)"
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile > /dev/null 2>&1
    swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo -e "  ${DIM}2GB swap created${RESET}"
  else
    swapon /swapfile 2>/dev/null || true
    echo -e "  ${DIM}Swap already exists${RESET}"
  fi
  ok

  step 4 "Firewall (UFW)"
  ufw allow 22/tcp > /dev/null 2>&1
  ufw allow 80/tcp > /dev/null 2>&1
  ufw allow 443/tcp > /dev/null 2>&1
  ufw --force enable > /dev/null 2>&1
  echo -e "  ${DIM}SSH, HTTP, HTTPS allowed - all else blocked${RESET}"
  ok

  step 5 "Fail2Ban (SSH protection)"
  apt-get install -y -qq fail2ban > /dev/null 2>&1
  cat > /etc/fail2ban/jail.local << 'JAILEOF'
[DEFAULT]
bantime = -1
findtime = 3600
maxretry = 1
backend = systemd
banaction = iptables-multiport

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 1
bantime = -1
JAILEOF
  systemctl enable fail2ban > /dev/null 2>&1
  systemctl restart fail2ban > /dev/null 2>&1
  echo -e "  ${DIM}1 failed SSH login = permanent ban${RESET}"
  ok

  step 6 "Automatic security updates"
  apt-get install -y -qq unattended-upgrades apt-listchanges > /dev/null 2>&1
  cat > /etc/apt/apt.conf.d/20auto-upgrades << 'AUTOEOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTOEOF
  cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'UPGEOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
UPGEOF
  systemctl enable unattended-upgrades > /dev/null 2>&1
  systemctl restart unattended-upgrades > /dev/null 2>&1
  echo -e "  ${DIM}Security patches auto-install daily, reboot at 4AM if needed${RESET}"
  ok

  step 7 "Pulling code"
  if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin main -q
    git reset --hard origin/main -q
    echo -e "  ${DIM}Updated to latest${RESET}"
  else
    rm -rf "$APP_DIR"
    git clone -q "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
  fi
  # Always restore .env from backup after git operations
  if [ -f "$ENV_BACKUP" ]; then
    cp -f "$ENV_BACKUP" "$APP_DIR/.env"
  fi
  ok

  step 8 "Environment"
  SESS_SECRET=$(openssl rand -hex 32)
  DB_PASS=$(openssl rand -hex 16)

  # If existing .env, preserve session secret and db password
  if [ -f "$APP_DIR/.env" ]; then
    EXISTING_SESS=$(grep "^SESSION_SECRET=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
    EXISTING_DB=$(grep "^POSTGRES_PASSWORD=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
    [ -n "$EXISTING_SESS" ] && SESS_SECRET="$EXISTING_SESS"
    [ -n "$EXISTING_DB" ] && DB_PASS="$EXISTING_DB"
  fi

  # Decode keys from bundled config - ZERO prompts ever
  DECODED_KEYS=$(base64 -d "$APP_DIR/deploy/.env.b64" 2>/dev/null || echo "")

  get_key() { echo "$DECODED_KEYS" | grep "^$1=" 2>/dev/null | cut -d= -f2-; }

  cat > "$APP_DIR/.env" << ENVFILE
DOMAIN=aipoweredsites.com
SITE_URL=https://aipoweredsites.com
POSTGRES_USER=aips
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=aipoweredsites
SESSION_SECRET=${SESS_SECRET}
ADMIN_EMAIL=anthonyjacksonverizon@gmail.com
ADMIN_PASSWORD=Aipowered2025!
STRIPE_SECRET_KEY=$(get_key STRIPE_SECRET_KEY)
STRIPE_PUBLISHABLE_KEY=$(get_key STRIPE_PUBLISHABLE_KEY)
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=$(get_key RESEND_API_KEY)
RESEND_AUDIENCE_ID=
OPENAI_API_KEY=
AI_INTEGRATIONS_OPENAI_API_KEY=
GOOGLE_PLACES_API_KEY=$(get_key GOOGLE_PLACES_API_KEY)
LINODE_API_KEY=$(get_key LINODE_API_KEY)
GITHUB_CLIENT_ID=$(get_key GITHUB_CLIENT_ID)
GITHUB_CLIENT_SECRET=$(get_key GITHUB_CLIENT_SECRET)
NETLIFY_API_TOKEN=$(get_key NETLIFY_API_TOKEN)
VERCEL_API_TOKEN=$(get_key VERCEL_API_TOKEN)
RAILWAY_API_TOKEN=$(get_key RAILWAY_API_TOKEN)
VAPID_PUBLIC_KEY=BK8LITNbUoKFCIiM7EHrf6CVTCuQnaiF0GtXU7NGzVt20Ykiaau-Iyg5efzglQ-wZKYQ47Da6XtQOnlYLSmEZ7Y
VAPID_PRIVATE_KEY=7JAIKLBBlFOACt9AoAJoe-IApXdfHrzOcFGlZaUcxDQ
VAPID_SUBJECT=mailto:hello@aipoweredsites.com
ENVFILE

  echo -e "  ${GREEN}All keys configured (zero prompts)${RESET}"

  # Save backup for next time
  cp -f "$APP_DIR/.env" "$ENV_BACKUP"

  SITE_DOMAIN="aipoweredsites.com"
  cat > "$APP_DIR/deploy/Caddyfile" << CADDYEOF
:80 {
  reverse_proxy app:5000
}

${SITE_DOMAIN} {
  reverse_proxy app:5000
}

www.${SITE_DOMAIN} {
  redir https://${SITE_DOMAIN}{uri} permanent
}
CADDYEOF
  echo -e "  ${DIM}Caddyfile configured for ${SITE_DOMAIN}${RESET}"
  ok

  step 9 "Building containers"
  cd "$APP_DIR"
  echo -e "  ${DIM}This takes 3-5 minutes, please wait...${RESET}"
  docker compose build --no-cache 2>&1 | tail -10
  BUILD_EXIT=${PIPESTATUS[0]}
  if [ $BUILD_EXIT -ne 0 ]; then
    fail "Docker build failed. Check output above."
  fi
  ok

  step 10 "Starting services"
  docker compose down 2>/dev/null || true
  docker compose up -d
  echo -e "  ${DIM}Waiting for database...${RESET}"
  sleep 10

  DB_READY=0
  for i in $(seq 1 15); do
    if docker compose exec -T db pg_isready -U aips -d aipoweredsites > /dev/null 2>&1; then
      DB_READY=1
      break
    fi
    sleep 3
  done
  if [ $DB_READY -eq 0 ]; then
    fail "Database did not start"
  fi
  ok

  step 11 "Database tables"
  for f in $(ls deploy/migrations/*.sql | sort); do
    echo -e "  ${DIM}Running: $(basename $f)${RESET}"
    docker compose exec -T db psql -U aips -d aipoweredsites < "$f" 2>/dev/null || true
  done
  echo -e "  ${DIM}All migrations applied${RESET}"

  docker compose restart app
  echo -e "  ${DIM}App restarted with fresh tables${RESET}"
  sleep 5
  ok

  step 12 "Health check"
  APP_READY=0
  for i in $(seq 1 12); do
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:80 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
      APP_READY=1
      break
    fi
    echo -e "  ${DIM}Waiting for app (attempt $i)...${RESET}"
    sleep 5
  done

  if [ $APP_READY -eq 0 ]; then
    echo -e "  ${YELLOW}App not responding yet - checking logs...${RESET}"
    docker compose logs --tail 30 app
  fi
  ok

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

  if [ $APP_READY -eq 1 ]; then
    echo -e "  ${GREEN}${BOLD}Site is LIVE!${RESET}"
  else
    echo -e "  ${YELLOW}Site may need a moment to start. Check: docker compose logs -f app${RESET}"
  fi
  echo ""
  echo -e "  ${CYAN}URL:${RESET}    https://${SITE_DOMAIN}"
  echo -e "  ${CYAN}Login:${RESET}  anthonyjacksonverizon@gmail.com / Aipowered2025!"
  echo ""
  echo -e "  ${WHITE}${BOLD}Security Active:${RESET}"
  echo -e "    ${GREEN}+${RESET} Firewall: only SSH/HTTP/HTTPS open"
  echo -e "    ${GREEN}+${RESET} Fail2Ban: 1 failed SSH login = permanent ban"
  echo -e "    ${GREEN}+${RESET} Auto security patches daily"
  echo -e "    ${GREEN}+${RESET} Auto reboot at 4AM if patch requires it"
  echo -e "    ${GREEN}+${RESET} Docker auto-restarts after reboot"
  echo -e "    ${GREEN}+${RESET} 2GB swap prevents out-of-memory crashes"
  echo ""
fi

echo -e "  ${CYAN}${BOLD}To deploy updates, always run this same command:${RESET}"
echo ""
echo -e "  ${WHITE}  sudo bash /opt/aipoweredsites/deploy/deploy.sh${RESET}"
echo ""
echo -e "  ${DIM}Or remotely:${RESET}"
echo -e "  ${WHITE}  curl -fsSL https://raw.githubusercontent.com/techytonys/billing-hub/main/deploy/deploy.sh | sudo bash${RESET}"
echo ""
