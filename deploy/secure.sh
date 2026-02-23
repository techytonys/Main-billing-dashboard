#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║                                                  ║"
echo "║      🔒 AI Powered Sites - Server Security 🔒    ║"
echo "║                                                  ║"
echo "║     Fail2Ban + Unattended Security Upgrades      ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✘ Please run with sudo: sudo bash deploy/secure.sh${NC}"
    exit 1
fi

echo -e "${BLUE}▸${NC} ${BOLD}Installing Fail2Ban...${NC}"
apt-get update -qq > /dev/null 2>&1
apt-get install -y fail2ban > /dev/null 2>&1
echo -e "  ${GREEN}✔${NC} Fail2Ban installed"

echo -e "${BLUE}▸${NC} ${BOLD}Configuring: 1 failed SSH attempt = permanent ban...${NC}"

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
echo -e "  ${GREEN}✔${NC} Fail2Ban active"

echo -e "${BLUE}▸${NC} ${BOLD}Setting up unattended security upgrades...${NC}"
apt-get install -y unattended-upgrades apt-listchanges > /dev/null 2>&1
echo -e "  ${GREEN}✔${NC} Unattended upgrades package installed"

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'AUTOEOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTOEOF
echo -e "  ${GREEN}✔${NC} Auto-update checks daily"

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
echo -e "  ${GREEN}✔${NC} Security patches install automatically"
echo -e "  ${GREEN}✔${NC} Auto-reboot at 4 AM if needed (Docker restarts automatically)"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                  ║${NC}"
echo -e "${GREEN}║            🎉 SECURITY ACTIVE! 🎉                ║${NC}"
echo -e "${GREEN}║                                                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Protection:${NC}"
echo -e "  ${GREEN}✔${NC} 1 failed SSH login = permanently banned"
echo -e "  ${GREEN}✔${NC} Security patches install automatically every day"
echo -e "  ${GREEN}✔${NC} Auto-reboot at 4 AM if a patch requires it"
echo -e "  ${GREEN}✔${NC} Docker containers auto-restart after reboot"
echo -e "  ${GREEN}✔${NC} Old kernels and unused packages cleaned up"
echo ""
echo -e "${BOLD}Unaffected:${NC}"
echo -e "  ${GREEN}✔${NC} Your website stays fully accessible"
echo -e "  ${GREEN}✔${NC} Admin login, client portal, all pages work"
echo ""
echo -e "${CYAN}Useful commands:${NC}"
echo -e "  See banned IPs:      ${BOLD}sudo fail2ban-client status sshd${NC}"
echo -e "  Unban an IP:         ${BOLD}sudo fail2ban-client set sshd unbanip <IP>${NC}"
echo -e "  Check upgrade logs:  ${BOLD}cat /var/log/unattended-upgrades/unattended-upgrades.log${NC}"
echo ""
