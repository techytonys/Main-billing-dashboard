#!/bin/bash
set -e

APP_DIR="/opt/aipoweredsites"
REPO_URL="https://github.com/techytonys/Main-billing-dashboard.git"
APP_USER="aips"

BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
WHITE='\033[1;37m'
RED='\033[1;31m'
RESET='\033[0m'

TOTAL_STEPS=13

step() {
  echo ""
  echo -e "  ${CYAN}[$1/$TOTAL_STEPS]${RESET} ${BOLD}$2${RESET}"
}

ok() {
  echo -e "  ${GREEN}done${RESET}"
}

fail() {
  echo -e "  ${RED}FAILED: $1${RESET}"
  exit 1
}

clear
echo ""
echo -e "${CYAN}"
echo '      _    ___   ____                              _  '
echo '     / \  |_ _| |  _ \ _____      _____ _ __ ___ | | '
echo '    / _ \  | |  | |_) / _ \ \ /\ / / _ \'"'"'__/ _ \| | '
echo '   / ___ \ | |  |  __/ (_) \ V  V /  __/ | |  __/|_| '
echo '  /_/   \_\___| |_|   \___/ \_/\_/ \___|_|  \___||_| '
echo -e "${RESET}"
echo -e "  ${WHITE}${BOLD}AI Powered Sites - Bare Metal Deploy${RESET}"
echo -e "  ${DIM}No Docker - Native Node.js + PostgreSQL + Nginx${RESET}"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo -e "  ${RED}Run as root: sudo bash deploy/install-bare.sh${RESET}"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

# ---- Step 1: System packages + updates ----
step 1 "System packages & updates"
apt update -qq > /dev/null 2>&1
apt upgrade -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" > /dev/null 2>&1
apt install -y -qq ca-certificates curl gnupg git ufw bc build-essential > /dev/null 2>&1
ok

# ---- Step 2: Swap space ----
step 2 "Swap space (prevents build OOM)"
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

# ---- Step 3: Firewall ----
step 3 "Firewall (UFW)"
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
echo -e "  ${DIM}SSH, HTTP, HTTPS allowed - all else blocked${RESET}"
ok

# ---- Step 4: Fail2Ban ----
step 4 "Fail2Ban (SSH brute force protection)"
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

# ---- Step 5: Automatic security updates ----
step 5 "Automatic security updates"
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

# ---- Step 6: Node.js 20 ----
step 6 "Node.js 20"
if ! command -v node &> /dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
  echo -e "  ${DIM}Node.js $(node -v) installed${RESET}"
else
  echo -e "  ${DIM}Node.js $(node -v) already installed${RESET}"
fi
ok

# ---- Step 7: PostgreSQL 16 ----
step 7 "PostgreSQL 16"
if ! command -v psql &> /dev/null; then
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  apt update -qq > /dev/null 2>&1
  apt install -y -qq postgresql-16 > /dev/null 2>&1
  echo -e "  ${DIM}PostgreSQL 16 installed${RESET}"
else
  echo -e "  ${DIM}PostgreSQL already installed${RESET}"
fi
systemctl enable postgresql > /dev/null 2>&1
systemctl start postgresql
ok

# ---- Step 8: Nginx (reverse proxy + SSL) ----
step 8 "Nginx + Certbot"
apt install -y -qq nginx certbot python3-certbot-nginx > /dev/null 2>&1
systemctl enable nginx > /dev/null 2>&1
systemctl start nginx
echo -e "  ${DIM}Nginx installed with SSL support${RESET}"
ok

# ---- Step 9: Clone / update code ----
step 9 "Pulling code"
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
ok

# ---- Step 10: Environment variables ----
step 10 "Environment"

STRIPE_SK=""
STRIPE_PK=""
STRIPE_WH=""
RESEND_KEY=""
RESEND_AUD=""
SITE_DOMAIN=""
GITHUB_CID=""
GITHUB_CSEC=""
OPENAI_KEY=""
GOOGLE_KEY=""
LINODE_KEY=""
NETLIFY_TOK=""
VERCEL_TOK=""
RAILWAY_TOK=""

if [ -f "$APP_DIR/.env" ]; then
  STRIPE_SK=$(grep "^STRIPE_SECRET_KEY=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  STRIPE_PK=$(grep "^STRIPE_PUBLISHABLE_KEY=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  STRIPE_WH=$(grep "^STRIPE_WEBHOOK_SECRET=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  RESEND_KEY=$(grep "^RESEND_API_KEY=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  RESEND_AUD=$(grep "^RESEND_AUDIENCE_ID=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  SITE_DOMAIN=$(grep "^DOMAIN=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  GITHUB_CID=$(grep "^GITHUB_CLIENT_ID=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  GITHUB_CSEC=$(grep "^GITHUB_CLIENT_SECRET=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  OPENAI_KEY=$(grep "^OPENAI_API_KEY=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  GOOGLE_KEY=$(grep "^GOOGLE_PLACES_API_KEY=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  LINODE_KEY=$(grep "^LINODE_API_KEY=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  NETLIFY_TOK=$(grep "^NETLIFY_API_TOKEN=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  VERCEL_TOK=$(grep "^VERCEL_API_TOKEN=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  RAILWAY_TOK=$(grep "^RAILWAY_API_TOKEN=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
fi

echo ""
echo -e "  ${YELLOW}Enter API keys (Enter to keep existing):${RESET}"
echo ""

prompt_key() {
  local label=$1 current=$2 varname=$3
  if [ -n "$current" ]; then
    echo -e "  ${DIM}$label: ${GREEN}set${RESET} (${DIM}${current:0:7}...${RESET})"
    read -p "    New value or Enter to keep: " newval
    [ -n "$newval" ] && eval "$varname='$newval'"
  else
    read -p "  $label: " newval
    eval "$varname='$newval'"
  fi
}

prompt_key "Stripe Secret Key (sk_...)" "$STRIPE_SK" STRIPE_SK
prompt_key "Stripe Publishable Key (pk_...)" "$STRIPE_PK" STRIPE_PK
prompt_key "Stripe Webhook Secret (whsec_...)" "$STRIPE_WH" STRIPE_WH
prompt_key "Resend API Key (re_...)" "$RESEND_KEY" RESEND_KEY
prompt_key "Resend Audience ID (optional)" "$RESEND_AUD" RESEND_AUD
prompt_key "OpenAI API Key (optional)" "$OPENAI_KEY" OPENAI_KEY
prompt_key "Google Places API Key (optional)" "$GOOGLE_KEY" GOOGLE_KEY
prompt_key "Linode API Key (optional)" "$LINODE_KEY" LINODE_KEY
prompt_key "GitHub Client ID (optional)" "$GITHUB_CID" GITHUB_CID
prompt_key "GitHub Client Secret (optional)" "$GITHUB_CSEC" GITHUB_CSEC
prompt_key "Netlify API Token (optional)" "$NETLIFY_TOK" NETLIFY_TOK
prompt_key "Vercel API Token (optional)" "$VERCEL_TOK" VERCEL_TOK
prompt_key "Railway API Token (optional)" "$RAILWAY_TOK" RAILWAY_TOK

if [ -z "$SITE_DOMAIN" ]; then
  read -p "  Domain (e.g. aipoweredsites.com): " SITE_DOMAIN
  SITE_DOMAIN=${SITE_DOMAIN:-aipoweredsites.com}
fi

if [ -z "$STRIPE_SK" ] || [ -z "$STRIPE_PK" ] || [ -z "$RESEND_KEY" ]; then
  echo -e "  ${RED}Stripe keys and Resend key are required${RESET}"
  exit 1
fi

SESS_SECRET=$(openssl rand -hex 32)
DB_PASS=$(openssl rand -hex 16)

if [ -f "$APP_DIR/.env" ]; then
  EXISTING_SESS=$(grep "^SESSION_SECRET=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  EXISTING_DB=$(grep "^POSTGRES_PASSWORD=" "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)
  [ -n "$EXISTING_SESS" ] && SESS_SECRET="$EXISTING_SESS"
  [ -n "$EXISTING_DB" ] && DB_PASS="$EXISTING_DB"
fi

cat > "$APP_DIR/.env" << ENVFILE
NODE_ENV=production
PORT=5000
DOMAIN=${SITE_DOMAIN}
SITE_URL=https://${SITE_DOMAIN}
DATABASE_URL=postgresql://aips:${DB_PASS}@localhost:5432/aipoweredsites
POSTGRES_USER=aips
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=aipoweredsites
SESSION_SECRET=${SESS_SECRET}
ADMIN_EMAIL=anthonyjacksonverizon@gmail.com
ADMIN_PASSWORD=Aipowered2025!
STRIPE_SECRET_KEY=${STRIPE_SK}
STRIPE_PUBLISHABLE_KEY=${STRIPE_PK}
STRIPE_WEBHOOK_SECRET=${STRIPE_WH}
RESEND_API_KEY=${RESEND_KEY}
RESEND_AUDIENCE_ID=${RESEND_AUD}
OPENAI_API_KEY=${OPENAI_KEY}
AI_INTEGRATIONS_OPENAI_API_KEY=${OPENAI_KEY}
GOOGLE_PLACES_API_KEY=${GOOGLE_KEY}
LINODE_API_KEY=${LINODE_KEY}
GITHUB_CLIENT_ID=${GITHUB_CID}
GITHUB_CLIENT_SECRET=${GITHUB_CSEC}
NETLIFY_API_TOKEN=${NETLIFY_TOK}
VERCEL_API_TOKEN=${VERCEL_TOK}
RAILWAY_API_TOKEN=${RAILWAY_TOK}
VAPID_PUBLIC_KEY=BK8LITNbUoKFCIiM7EHrf6CVTCuQnaiF0GtXU7NGzVt20Ykiaau-Iyg5efzglQ-wZKYQ47Da6XtQOnlYLSmEZ7Y
VAPID_PRIVATE_KEY=7JAIKLBBlFOACt9AoAJoe-IApXdfHrzOcFGlZaUcxDQ
VAPID_SUBJECT=mailto:hello@aipoweredsites.com
ENVFILE
ok

# ---- Step 11: Setup database ----
step 11 "Database setup"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='aips'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER aips WITH PASSWORD '${DB_PASS}';" > /dev/null 2>&1

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='aipoweredsites'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE aipoweredsites OWNER aips;" > /dev/null 2>&1

sudo -u postgres psql -c "ALTER USER aips WITH PASSWORD '${DB_PASS}';" > /dev/null 2>&1
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aipoweredsites TO aips;" > /dev/null 2>&1
sudo -u postgres psql -d aipoweredsites -c "GRANT ALL ON SCHEMA public TO aips;" > /dev/null 2>&1

for f in $(ls "$APP_DIR/deploy/migrations/"*.sql 2>/dev/null | sort); do
  echo -e "  ${DIM}Running: $(basename $f)${RESET}"
  PGPASSWORD="${DB_PASS}" psql -U aips -h localhost -d aipoweredsites < "$f" > /dev/null 2>&1 || true
done
echo -e "  ${DIM}All migrations applied${RESET}"
ok

# ---- Step 12: Build application ----
step 12 "Building application"
cd "$APP_DIR"
echo -e "  ${DIM}Installing dependencies...${RESET}"
npm ci --legacy-peer-deps 2>&1 | tail -3
echo -e "  ${DIM}Building frontend + backend...${RESET}"
npm run build 2>&1 | tail -5
BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
  fail "Build failed"
fi
echo -e "  ${DIM}Build complete${RESET}"
ok

# ---- Step 13: Nginx config + systemd service + start ----
step 13 "Configure Nginx & start app"

cat > /etc/nginx/sites-available/aipoweredsites << NGINXEOF
server {
    listen 80;
    server_name ${SITE_DOMAIN} www.${SITE_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/aipoweredsites /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1 && systemctl reload nginx

cat > /etc/systemd/system/aipoweredsites.service << SVCEOF
[Unit]
Description=AI Powered Sites
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/dist/index.cjs
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=aipoweredsites

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable aipoweredsites > /dev/null 2>&1
systemctl restart aipoweredsites
echo -e "  ${DIM}App running as system service${RESET}"

echo -e "  ${DIM}Setting up SSL...${RESET}"
certbot --nginx -d "${SITE_DOMAIN}" -d "www.${SITE_DOMAIN}" --non-interactive --agree-tos --email "admin@${SITE_DOMAIN}" --redirect 2>/dev/null || \
  echo -e "  ${YELLOW}SSL setup skipped (domain may not point to this server yet)${RESET}"
ok

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

sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:80 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
  echo -e "  ${GREEN}${BOLD}Site is LIVE!${RESET}"
else
  echo -e "  ${YELLOW}HTTP: $HTTP_CODE - checking logs...${RESET}"
  journalctl -u aipoweredsites --no-pager -n 20
fi
echo ""
echo -e "  ${CYAN}URL:${RESET}       https://${SITE_DOMAIN}"
echo -e "  ${CYAN}Login:${RESET}     anthonyjacksonverizon@gmail.com / Aipowered2025!"
echo ""
echo -e "  ${WHITE}${BOLD}Security Active:${RESET}"
echo -e "    ${GREEN}+${RESET} Firewall: only SSH/HTTP/HTTPS open"
echo -e "    ${GREEN}+${RESET} Fail2Ban: 1 failed SSH login = permanent ban"
echo -e "    ${GREEN}+${RESET} Auto security patches daily"
echo -e "    ${GREEN}+${RESET} Auto reboot at 4AM if patch requires it"
echo -e "    ${GREEN}+${RESET} 2GB swap prevents out-of-memory crashes"
echo ""
echo -e "  ${CYAN}Commands:${RESET}"
echo -e "    systemctl status aipoweredsites           # app status"
echo -e "    journalctl -u aipoweredsites -f           # live logs"
echo -e "    systemctl restart aipoweredsites          # restart app"
echo -e "    sudo fail2ban-client status sshd           # banned IPs"
echo -e "    bash /opt/aipoweredsites/deploy/update-bare.sh  # update"
echo ""
