#!/bin/bash
echo "=== Fixing env files ==="
sed -i '/^[^#=]*$/d' /root/.aips_env_backup 2>/dev/null || true
sed -i '/^[^#=]*$/d' /opt/aipoweredsites/.env 2>/dev/null || true
sed -i '/^$/d' /root/.aips_env_backup 2>/dev/null || true
sed -i '/^$/d' /opt/aipoweredsites/.env 2>/dev/null || true
echo "=== Pulling latest deploy script ==="
curl -fsSL -o /tmp/deploy_new.sh https://raw.githubusercontent.com/techytonys/Main-billing-dashboard/main/deploy/deploy.sh
cp -f /tmp/deploy_new.sh /opt/aipoweredsites/deploy/deploy.sh
echo "=== Running deploy ==="
bash /opt/aipoweredsites/deploy/deploy.sh
