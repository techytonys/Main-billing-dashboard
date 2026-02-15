#!/bin/bash
set -e

APP_DIR="/opt/aipoweredsites"
REPO_URL="https://github.com/techytonys/Main-billing-dashboard.git"

echo "============================================"
echo "  AI Powered Sites - Full Server Deploy"
echo "============================================"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: This script must be run as root (sudo bash install.sh)"
  exit 1
fi

# ---- Step 1: System packages ----
export DEBIAN_FRONTEND=noninteractive
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

echo "[2/8] Installing dependencies..."
apt install -y ca-certificates curl gnupg git ufw

# ---- Step 2: Docker ----
echo "[3/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt update
  apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  echo "Docker installed."
else
  echo "Docker already installed, skipping."
fi

systemctl enable docker
systemctl start docker

# ---- Step 3: Firewall ----
echo "[4/8] Setting up firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ---- Step 4: Clone repo ----
echo "[5/8] Cloning repository..."
if [ -d "$APP_DIR/.git" ]; then
  echo "Repo already exists, pulling latest..."
  cd "$APP_DIR"
  git pull origin main
else
  mkdir -p "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ---- Step 5: Environment file ----
echo "[6/8] Setting up environment..."
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo "============================================"
  echo "  Enter your credentials (one-time setup)"
  echo "============================================"
  echo ""

  read -sp "  Admin password (for dashboard login): " ADMIN_PWD
  echo ""
  read -p "  Stripe Secret Key (sk_live_...): " STRIPE_SK
  read -p "  Stripe Publishable Key (pk_live_...): " STRIPE_PK
  read -p "  Resend API Key (re_...): " RESEND_KEY
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

  echo "Environment file created."
else
  echo ".env already exists, keeping current values."
fi

# ---- Step 6: Build and start ----
echo "[7/8] Building and starting containers..."
cd "$APP_DIR"
docker compose up -d --build

echo "Waiting for database to be ready..."
sleep 10

# ---- Step 7: Database ----
echo "[8/8] Setting up database tables..."
docker compose exec -T app npx drizzle-kit push

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "  Your site is now live."
echo ""
echo "  Useful commands:"
echo "    Check status:  docker compose ps"
echo "    View logs:     docker compose logs -f app"
echo "    Update later:  bash $APP_DIR/deploy/update.sh"
echo ""
echo "============================================"
