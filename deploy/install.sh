#!/bin/bash
set -e

echo "============================================"
echo "  AI Powered Sites - Server Setup (Ubuntu)"
echo "============================================"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: This script must be run as root (sudo ./install.sh)"
  exit 1
fi

echo "[1/6] Updating system packages..."
apt update && apt upgrade -y

echo "[2/6] Installing required dependencies..."
apt install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  ufw

echo "[3/6] Installing Docker..."
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
  echo "Docker installed successfully."
else
  echo "Docker already installed, skipping."
fi

systemctl enable docker
systemctl start docker

echo "[4/6] Creating application directory..."
APP_DIR="/opt/aipoweredsites"
mkdir -p "$APP_DIR"

echo "[5/6] Setting up firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "Firewall configured (SSH, HTTP, HTTPS allowed)."

echo "[6/6] Setup complete!"
echo ""
echo "============================================"
echo "  NEXT STEPS"
echo "============================================"
echo ""
echo "  1. Clone your repo into $APP_DIR:"
echo "     cd $APP_DIR"
echo "     git clone <your-repo-url> ."
echo ""
echo "  2. Copy and edit the environment file:"
echo "     cp deploy/.env.example .env"
echo "     nano .env"
echo ""
echo "  3. Set your domain in the .env file"
echo ""
echo "  4. Start everything:"
echo "     docker compose up -d --build"
echo ""
echo "  5. Push database tables:"
echo "     docker compose exec app npx drizzle-kit push"
echo ""
echo "============================================"
