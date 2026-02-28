#!/bin/bash
set -e
echo "Fixing .env files..."
sed -i '/^[^#=]*$/d' /root/.aips_env_backup 2>/dev/null || true
sed -i '/^[^#=]*$/d' /opt/aipoweredsites/.env 2>/dev/null || true
sed -i '/^$/d' /root/.aips_env_backup 2>/dev/null || true
sed -i '/^$/d' /opt/aipoweredsites/.env 2>/dev/null || true
echo "Fixed. Running deploy..."
bash /opt/aipoweredsites/deploy/deploy.sh
