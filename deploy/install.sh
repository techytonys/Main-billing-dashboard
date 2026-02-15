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
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y

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
  cp "$APP_DIR/deploy/.env.example" "$APP_DIR/.env"
  echo ""
  echo "============================================"
  echo "  IMPORTANT: Edit your .env file now"
  echo "============================================"
  echo ""
  echo "  You need to set these 4 values:"
  echo "    - ADMIN_PASSWORD (your admin login password)"
  echo "    - STRIPE_SECRET_KEY (from Stripe dashboard)"
  echo "    - STRIPE_PUBLISHABLE_KEY (from Stripe dashboard)"
  echo "    - RESEND_API_KEY (from Resend dashboard)"
  echo ""
  echo "  Opening the file for you now..."
  echo "  Save and close when done (Ctrl+X, Y, Enter)"
  echo ""
  nano "$APP_DIR/.env"
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
