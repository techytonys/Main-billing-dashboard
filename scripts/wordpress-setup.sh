#!/bin/bash
set -euo pipefail

SETUP_API_URL="${SETUP_API_URL:-}"
SETUP_PORTAL_TOKEN="${SETUP_PORTAL_TOKEN:-}"
SETUP_SERVER_ID="${SETUP_SERVER_ID:-}"
SETUP_WP_DOMAIN="${SETUP_WP_DOMAIN:-}"
SETUP_WP_TITLE="${SETUP_WP_TITLE:-My WordPress Site}"
SETUP_WP_ADMIN_USER="${SETUP_WP_ADMIN_USER:-admin}"
SETUP_WP_ADMIN_PASS="${SETUP_WP_ADMIN_PASS:-}"
SETUP_WP_ADMIN_EMAIL="${SETUP_WP_ADMIN_EMAIL:-}"

export DEBIAN_FRONTEND=noninteractive

echo ""
echo "  ==========================================="
echo "  |  AI POWERED SITES                       |"
echo "  |  WordPress + Caddy Auto-Installer       |"
echo "  ==========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "  [ERROR] Must run as root."
  exit 1
fi

SERVER_IP=$(curl -s4 --connect-timeout 10 ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")
echo "  Server IP: ${SERVER_IP}"

if [ -z "$SETUP_WP_ADMIN_PASS" ]; then
  SETUP_WP_ADMIN_PASS="WP-$(date +%s)-$(head -c 6 /dev/urandom | base64 | tr -d '/+=')"
fi

DB_NAME="wordpress"
DB_USER="wpuser"
DB_PASS="db-$(head -c 12 /dev/urandom | base64 | tr -d '/+=')"

echo "  [1/7] Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq > /dev/null 2>&1

echo "  [2/7] Installing MariaDB..."
apt-get install -y -qq mariadb-server mariadb-client > /dev/null 2>&1
systemctl enable mariadb
systemctl start mariadb

mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo "  + MariaDB configured"

echo "  [3/7] Installing PHP 8.3..."
apt-get install -y -qq software-properties-common > /dev/null 2>&1
add-apt-repository -y ppa:ondrej/php > /dev/null 2>&1
apt-get update -qq
apt-get install -y -qq php8.3-fpm php8.3-mysql php8.3-curl php8.3-gd php8.3-mbstring \
  php8.3-xml php8.3-zip php8.3-intl php8.3-imagick php8.3-soap php8.3-bcmath \
  php8.3-opcache unzip curl > /dev/null 2>&1

sed -i 's/upload_max_filesize = .*/upload_max_filesize = 64M/' /etc/php/8.3/fpm/php.ini
sed -i 's/post_max_size = .*/post_max_size = 64M/' /etc/php/8.3/fpm/php.ini
sed -i 's/memory_limit = .*/memory_limit = 256M/' /etc/php/8.3/fpm/php.ini
sed -i 's/max_execution_time = .*/max_execution_time = 300/' /etc/php/8.3/fpm/php.ini

PHP_FPM_POOL="/etc/php/8.3/fpm/pool.d/www.conf"
sed -i 's|listen = .*|listen = /run/php/php8.3-fpm.sock|' "$PHP_FPM_POOL"

systemctl enable php8.3-fpm
systemctl restart php8.3-fpm
echo "  + PHP 8.3-FPM configured"

echo "  [4/7] Installing Caddy..."
apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https > /dev/null 2>&1
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
apt-get update -qq
apt-get install -y -qq caddy > /dev/null 2>&1
echo "  + Caddy installed"

echo "  [5/7] Downloading WordPress..."
WP_DIR="/var/www/wordpress"
mkdir -p "$WP_DIR"
cd /tmp
curl -sO https://wordpress.org/latest.tar.gz
tar -xzf latest.tar.gz
cp -a wordpress/* "$WP_DIR/"
rm -rf /tmp/wordpress /tmp/latest.tar.gz

cp "$WP_DIR/wp-config-sample.php" "$WP_DIR/wp-config.php"
sed -i "s/database_name_here/${DB_NAME}/" "$WP_DIR/wp-config.php"
sed -i "s/username_here/${DB_USER}/" "$WP_DIR/wp-config.php"
sed -i "s/password_here/${DB_PASS}/" "$WP_DIR/wp-config.php"

SALT=$(curl -s https://api.wordpress.org/secret-key/1.1/salt/)
SALT_ESCAPED=$(echo "$SALT" | sed 's/[&/\]/\\&/g')
php -r "
\$config = file_get_contents('${WP_DIR}/wp-config.php');
\$lines = explode(\"\\n\", \$config);
\$new = [];
\$skip = false;
foreach (\$lines as \$line) {
  if (strpos(\$line, \"define( 'AUTH_KEY'\") !== false) \$skip = true;
  if (\$skip && strpos(\$line, \"define( 'NONCE_SALT'\") !== false) { \$skip = false; continue; }
  if (!\$skip) \$new[] = \$line;
}
file_put_contents('${WP_DIR}/wp-config.php', implode(\"\\n\", \$new));
"

SALT_LINE_NUM=$(grep -n "define( 'DB_COLLATE'" "$WP_DIR/wp-config.php" | head -1 | cut -d: -f1)
if [ -n "$SALT_LINE_NUM" ]; then
  SALT_LINE_NUM=$((SALT_LINE_NUM + 1))
  SALT_TEMP=$(mktemp)
  echo "$SALT" > "$SALT_TEMP"
  sed -i "${SALT_LINE_NUM}r ${SALT_TEMP}" "$WP_DIR/wp-config.php"
  rm -f "$SALT_TEMP"
fi

chown -R www-data:www-data "$WP_DIR"
chmod -R 755 "$WP_DIR"
echo "  + WordPress downloaded and configured"

echo "  [6/7] Configuring Caddy..."
USE_DOMAIN="$SETUP_WP_DOMAIN"
if [ -z "$USE_DOMAIN" ] || [ "$USE_DOMAIN" = "null" ]; then
  USE_DOMAIN="$SERVER_IP"
fi

if [[ "$USE_DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  CADDY_BLOCK="http://${USE_DOMAIN}"
else
  CADDY_BLOCK="${USE_DOMAIN}"
fi

cat > /etc/caddy/Caddyfile <<CADDYEOF
${CADDY_BLOCK} {
    root * /var/www/wordpress
    php_fastcgi unix//run/php/php8.3-fpm.sock
    file_server
    encode gzip

    @disallowed {
        path /xmlrpc.php
        path /.htaccess
        path /wp-config.php
    }
    respond @disallowed 403

    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }
}
CADDYEOF

systemctl enable caddy
systemctl restart caddy
echo "  + Caddy configured with auto-SSL"

echo "  [7/7] Running WordPress install..."
apt-get install -y -qq wget > /dev/null 2>&1
wget -qO /usr/local/bin/wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x /usr/local/bin/wp

WP_URL="http://${USE_DOMAIN}"
if ! [[ "$USE_DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  WP_URL="https://${USE_DOMAIN}"
fi

WP_INSTALL_OK=false
for attempt in 1 2 3; do
  echo "  WordPress install attempt ${attempt}..."
  if sudo -u www-data wp core install \
    --path="$WP_DIR" \
    --url="$WP_URL" \
    --title="$SETUP_WP_TITLE" \
    --admin_user="$SETUP_WP_ADMIN_USER" \
    --admin_password="$SETUP_WP_ADMIN_PASS" \
    --admin_email="$SETUP_WP_ADMIN_EMAIL" \
    --skip-email 2>&1; then
    WP_INSTALL_OK=true
    break
  fi
  sleep 5
done

if [ "$WP_INSTALL_OK" = true ]; then
  sudo -u www-data wp rewrite structure '/%postname%/' --path="$WP_DIR" 2>/dev/null || true
  echo "  + WordPress installed successfully"
else
  echo "  ! WordPress install failed after 3 attempts"
fi

ufw allow 80/tcp > /dev/null 2>&1 || true
ufw allow 443/tcp > /dev/null 2>&1 || true

echo ""
echo "  ==========================================="
echo "  WordPress Installation Complete!"
echo "  ==========================================="
echo ""
echo "  Site URL:      ${WP_URL}"
echo "  Admin URL:     ${WP_URL}/wp-admin"
echo "  Admin User:    ${SETUP_WP_ADMIN_USER}"
echo "  Admin Pass:    ${SETUP_WP_ADMIN_PASS}"
echo "  Database:      ${DB_NAME}"
echo ""

if [ "$WP_INSTALL_OK" = true ] && [ -n "$SETUP_API_URL" ] && [ -n "$SETUP_PORTAL_TOKEN" ] && [ -n "$SETUP_SERVER_ID" ]; then
  if sudo -u www-data wp core is-installed --path="$WP_DIR" 2>/dev/null; then
    echo "  Notifying portal..."
    CALLBACK_RESPONSE=$(curl -s -w "\n%{http_code}" --connect-timeout 15 \
      -X POST "${SETUP_API_URL}/api/portal/${SETUP_PORTAL_TOKEN}/servers/${SETUP_SERVER_ID}/wordpress-ready" \
      -H "Content-Type: application/json" \
      -d "{
        \"wordpressDomain\": \"${USE_DOMAIN}\",
        \"wordpressAdminUser\": \"${SETUP_WP_ADMIN_USER}\",
        \"wordpressAdminPass\": \"${SETUP_WP_ADMIN_PASS}\",
        \"wordpressUrl\": \"${WP_URL}\",
        \"serverIp\": \"${SERVER_IP}\"
      }" 2>&1)
    HTTP_CODE=$(echo "$CALLBACK_RESPONSE" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
      echo "  + Portal notified successfully"
    else
      echo "  ! Portal notification returned ${HTTP_CODE}"
    fi
  else
    echo "  ! WordPress core not verified, skipping portal notification"
  fi
elif [ "$WP_INSTALL_OK" != true ]; then
  echo "  ! Skipping portal notification — WordPress install failed"
fi

echo ""
echo "  Setup complete!"
echo ""
