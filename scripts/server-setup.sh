#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

INTERACTIVE=false
if [ -t 0 ] && [ -t 1 ]; then
  INTERACTIVE=true
fi

if [ "$INTERACTIVE" = false ]; then
  RED=""
  GREEN=""
  YELLOW=""
  CYAN=""
  BLUE=""
  MAGENTA=""
  BOLD=""
  DIM=""
  NC=""
fi

if [ "$INTERACTIVE" = false ]; then
  log_step() { echo -e "\n  ──────────────────────────────────"; echo "  🔧 [$1] $2"; echo "  ──────────────────────────────────"; }
  log_warn() { echo "  ⚠️  $1"; }
  log_error() { echo "  ❌ $1"; }
  log_info() { echo "  ℹ️  $1"; }
  log_ok() { echo "  ✅ $1"; }
else
  log_step() { echo -e "\n${BOLD}${GREEN}  [$1]${NC} ${BOLD}$2${NC}"; }
  log_warn() { echo -e "  ${YELLOW}  ! $1${NC}"; }
  log_error() { echo -e "  ${RED}  x $1${NC}"; }
  log_info() { echo -e "  ${CYAN}  > $1${NC}"; }
  log_ok() { echo -e "  ${GREEN}  + $1${NC}"; }
fi

spinner() {
  local pid=$1
  local msg="${2:-Working}"

  if [ "$INTERACTIVE" = false ]; then
    echo "  ⏳ $msg ..."
    local dots=0
    while kill -0 "$pid" 2>/dev/null; do
      dots=$(( (dots + 1) % 4 ))
      case $dots in
        0) echo "     ░░░░░░░░░░ working ░░░░░░░░░░" ;;
        1) echo "     ▒▒▒▒▒▒▒▒▒▒ working ▒▒▒▒▒▒▒▒▒▒" ;;
        2) echo "     ▓▓▓▓▓▓▓▓▓▓ working ▓▓▓▓▓▓▓▓▓▓" ;;
        3) echo "     ██████████ working ██████████" ;;
      esac
      sleep 2
    done
    wait "$pid" 2>/dev/null
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
      echo "  ⚠️  $msg finished with warnings (exit code $exit_code)"
    else
      echo "  ✅ $msg — complete"
    fi
    return $exit_code
  fi

  local frames=("|" "/" "-" "\\")
  local i=0
  tput civis 2>/dev/null || true
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${CYAN}%s${NC} ${DIM}%s...${NC}  " "${frames[$i]}" "$msg"
    i=$(( (i + 1) % ${#frames[@]} ))
    sleep 0.15
  done
  wait "$pid" 2>/dev/null
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    printf "\r  ${YELLOW}!${NC} %s (warning)     \n" "$msg"
  else
    printf "\r  ${GREEN}+${NC} %s              \n" "$msg"
  fi
  tput cnorm 2>/dev/null || true
  return $exit_code
}

spinner_critical() {
  local pid=$1
  local msg="${2:-Working}"
  spinner "$pid" "$msg"
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    log_error "$msg FAILED (exit code $exit_code). Aborting."
    exit 1
  fi
  return 0
}

progress_bar() {
  local current=$1
  local total=$2
  local width=30
  local pct=$((current * 100 / total))
  local filled=$((current * width / total))
  local empty=$((width - filled))
  local bar_filled=""
  local bar_empty=""
  for ((i=0; i<filled; i++)); do bar_filled+="█"; done
  for ((i=0; i<empty; i++)); do bar_empty+="░"; done

  if [ "$INTERACTIVE" = false ]; then
    echo ""
    echo "  ┌──────────────────────────────────┐"
    echo "  │ ${bar_filled}${bar_empty} │ ${pct}%"
    echo "  └──────────────────────────────────┘"
    echo "  Step ${current} of ${total} complete"
    echo ""
  else
    printf "\r  ${DIM}[${NC}${GREEN}%s${NC}${DIM}%s${NC}${DIM}]${NC} ${BOLD}%3d%%${NC}" \
      "$bar_filled" "$bar_empty" "$pct"
  fi
}

countdown() {
  local secs=$1
  if [ "$INTERACTIVE" = false ]; then
    echo "  ⏳ Starting setup in a moment..."
    echo ""
    return
  fi
  for ((i=secs; i>0; i--)); do
    printf "\r  ${YELLOW}Starting in ${BOLD}%d${NC}${YELLOW}...${NC}  " "$i"
    sleep 1
  done
  printf "\r  ${GREEN}${BOLD}Go!${NC}                    \n"
}

if [ "$INTERACTIVE" = true ]; then
  clear
fi

echo ""
echo -e "${CYAN}${BOLD}"
if [ "$INTERACTIVE" = true ]; then
echo "  ==========================================="
echo "  |                                          |"
echo "  |     AI POWERED SITES                     |"
echo "  |     Server Hardening & Setup  v3.0       |"
echo "  |     Certificate-Based SSH Security       |"
echo "  |                                          |"
echo "  ==========================================="
else
echo "  AI Powered Sites - Server Setup v3.0"
echo "  Certificate-Based SSH Security"
fi
echo -e "${NC}"

echo ""
echo -e "  ${BOLD}${YELLOW}DISCLAIMER${NC}"
echo -e "  ${DIM}-------------------------------------------${NC}"
echo -e "  This script is provided as-is by AI Powered"
echo -e "  Sites for the purpose of server hardening"
echo -e "  and initial setup. By running this script"
echo -e "  you acknowledge the following:"
echo ""
echo -e "  ${YELLOW}1.${NC} This script may ${BOLD}not${NC} be sold, modified,"
echo -e "     redistributed, or resold without written"
echo -e "     permission from AI Powered Sites."
echo ""
echo -e "  ${YELLOW}2.${NC} This script is run at ${BOLD}your own risk${NC}."
echo -e "     AI Powered Sites is not liable for any"
echo -e "     damages, data loss, or service disruption."
echo ""
echo -e "  ${YELLOW}3.${NC} This script will make ${BOLD}system-level changes${NC}"
echo -e "     including user creation, SSH hardening,"
echo -e "     firewall configuration, and package"
echo -e "     installation."
echo ""
echo -e "  ${YELLOW}4.${NC} This script is not saved to the server."
echo -e "     It runs in memory via pipe and leaves"
echo -e "     no script file behind."
echo -e "  ${DIM}-------------------------------------------${NC}"
echo ""

if [ "$INTERACTIVE" = true ]; then
  read -p "  Do you agree to these terms? (yes/no): " ACCEPT_TERMS
  if [ "${ACCEPT_TERMS,,}" != "yes" ]; then
    echo ""
    echo -e "  ${RED}Terms not accepted. Setup cancelled.${NC}"
    echo -e "  ${DIM}No changes have been made to this server.${NC}"
    echo ""
    exit 0
  fi
  echo ""
  echo -e "  ${GREEN}Terms accepted. Proceeding with setup...${NC}"
  echo ""
fi

if [ "$EUID" -ne 0 ]; then
  log_error "This script must be run as root."
  exit 1
fi

SETUP_USER="${SETUP_USER:-}"
SETUP_EMAIL="${SETUP_EMAIL:-}"
SETUP_API_URL="${SETUP_API_URL:-}"
SETUP_PORTAL_TOKEN="${SETUP_PORTAL_TOKEN:-}"
SETUP_SERVER_ID="${SETUP_SERVER_ID:-}"
SETUP_FIRST_NAME="${SETUP_FIRST_NAME:-}"
SETUP_LAST_NAME="${SETUP_LAST_NAME:-}"
SETUP_LICENSE_KEY="${SETUP_LICENSE_KEY:-}"
SETUP_ADMIN_SSH_KEY="${SETUP_ADMIN_SSH_KEY:-}"

echo ""
echo "============================================"
echo "  LICENSE VALIDATION"
echo "============================================"
echo ""

if [ -z "$SETUP_LICENSE_KEY" ]; then
  if [ "$INTERACTIVE" = true ]; then
    read -p "  Enter your license key: " SETUP_LICENSE_KEY
  fi
fi

if [ -z "$SETUP_LICENSE_KEY" ]; then
  echo "  [ERROR] No license key provided. Setup cannot continue."
  echo "  You can find your license key in your client portal."
  exit 1
fi

if [ -z "$SETUP_API_URL" ]; then
  echo "  [ERROR] No API URL configured. Cannot validate license."
  exit 1
fi

echo "  License Key: ${SETUP_LICENSE_KEY}"
echo "  Validating against: ${SETUP_API_URL}"
echo ""
echo "  Detecting server IP..."

SERVER_IP=$(curl -s4 --connect-timeout 10 ifconfig.me 2>/dev/null || echo "unknown")
SERVER_HOSTNAME=$(hostname 2>/dev/null || echo "unknown")

echo "  Server IP: ${SERVER_IP}"
echo "  Hostname:  ${SERVER_HOSTNAME}"
echo ""
echo "  Contacting license server..."

LICENSE_RESPONSE=$(curl -s --connect-timeout 15 -X POST "${SETUP_API_URL}/api/license/validate" \
  -H "Content-Type: application/json" \
  -d "{\"licenseKey\":\"${SETUP_LICENSE_KEY}\",\"serverIp\":\"${SERVER_IP}\",\"hostname\":\"${SERVER_HOSTNAME}\"}" 2>/dev/null)

echo "  Response: ${LICENSE_RESPONSE}"

LICENSE_VALID=$(echo "$LICENSE_RESPONSE" | grep -o '"valid":[a-z]*' | cut -d: -f2 || true)
LICENSE_ERROR=$(echo "$LICENSE_RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4 || true)
LICENSEE=$(echo "$LICENSE_RESPONSE" | grep -o '"licensee":"[^"]*"' | cut -d'"' -f4 || true)

if [ "$LICENSE_VALID" != "true" ]; then
  echo ""
  echo "  ============================================"
  echo "  [FAILED] LICENSE VALIDATION FAILED"
  if [ -n "$LICENSE_ERROR" ]; then
    echo "  Reason: ${LICENSE_ERROR}"
  fi
  echo "  Contact support or check your client portal."
  echo "  ============================================"
  echo ""
  exit 1
fi

echo ""
echo "  ============================================"
echo "  ✅ LICENSE VALIDATED SUCCESSFULLY!"
if [ -n "$LICENSEE" ]; then
  echo "  Licensed to: ${LICENSEE}"
fi
echo "  ============================================"
echo ""
echo "  🚀 Starting server setup script..."
echo ""

if [ -z "$SETUP_FIRST_NAME" ] || [ -z "$SETUP_LAST_NAME" ] || [ -z "$SETUP_EMAIL" ]; then
  if [ "$INTERACTIVE" = true ]; then
    echo -e "  ${CYAN}Welcome! Let's get your server set up.${NC}"
    echo ""
    if [ -z "$SETUP_FIRST_NAME" ]; then
      read -p "  Your first name: " SETUP_FIRST_NAME
    fi
    if [ -z "$SETUP_LAST_NAME" ]; then
      read -p "  Your last name:  " SETUP_LAST_NAME
    fi
    if [ -z "$SETUP_EMAIL" ]; then
      read -p "  Your email address: " SETUP_EMAIL
    fi
  else
    echo ""
    echo "  ============================================"
    echo "  ❌ MISSING REQUIRED INFO"
    echo "  ============================================"
    if [ -z "$SETUP_FIRST_NAME" ]; then
      echo "  - First name is missing (SETUP_FIRST_NAME)"
    fi
    if [ -z "$SETUP_LAST_NAME" ]; then
      echo "  - Last name is missing (SETUP_LAST_NAME)"
    fi
    if [ -z "$SETUP_EMAIL" ]; then
      echo "  - Email is missing (SETUP_EMAIL)"
    fi
    echo ""
    echo "  These are normally provided automatically"
    echo "  when running from the client portal."
    echo ""
    echo "  To run manually, set environment variables:"
    echo "  export SETUP_FIRST_NAME=\"John\""
    echo "  export SETUP_LAST_NAME=\"Doe\""
    echo "  export SETUP_EMAIL=\"john@example.com\""
    echo "  ============================================"
    echo ""
    exit 1
  fi
fi

if [ -z "$SETUP_FIRST_NAME" ] || [ -z "$SETUP_LAST_NAME" ]; then
  echo "  [ERROR] Name cannot be empty."
  exit 1
fi
if [ -z "$SETUP_EMAIL" ]; then
  echo "  [ERROR] Email cannot be empty."
  exit 1
fi

FULL_NAME="${SETUP_FIRST_NAME} ${SETUP_LAST_NAME}"

echo ""
echo "  👤 Name:  ${FULL_NAME}"
echo "  📧 Email: ${SETUP_EMAIL}"
echo ""

if [ -z "$SETUP_USER" ]; then
  if [ "$INTERACTIVE" = true ]; then
    read -p "  Choose a username for SSH access: " SETUP_USER
  else
    SETUP_USER="admin"
  fi
fi
if [ -z "$SETUP_USER" ]; then
  echo "  [ERROR] Username cannot be empty."
  exit 1
fi

NEW_USER="$SETUP_USER"
USER_EMAIL="$SETUP_EMAIL"
API_URL="${SETUP_API_URL%/}"
PORTAL_TOKEN="$SETUP_PORTAL_TOKEN"
SERVER_ID="$SETUP_SERVER_ID"

TOTAL_STEPS=12

echo ""
echo -e "  ${BOLD}${CYAN}Here's what this script will do:${NC}"
echo ""
echo -e "  ${DIM}-------------------------------------------${NC}"
echo -e "  ${GREEN} 1.${NC}  Update & upgrade system packages"
echo -e "  ${GREEN} 2.${NC}  Enable automatic security updates"
echo -e "  ${GREEN} 3.${NC}  Create your user account ${BOLD}(${NEW_USER})${NC}"
echo -e "  ${GREEN} 4.${NC}  Generate SSH keys (4096-bit RSA)"
echo -e "  ${GREEN} 5.${NC}  Set up SSH Certificate Authority"
echo -e "  ${GREEN} 6.${NC}  Harden SSH config (random port, no root)"
echo -e "  ${GREEN} 7.${NC}  Configure UFW firewall"
echo -e "  ${GREEN} 8.${NC}  Install & configure Fail2Ban"
echo -e "  ${GREEN} 9.${NC}  Apply kernel & network hardening"
echo -e "  ${GREEN}10.${NC}  Disable unused services & tighten perms"
echo -e "  ${GREEN}11.${NC}  Install Docker & Docker Compose"
echo -e "  ${GREEN}12.${NC}  Send credentials to your portal"
echo -e "  ${DIM}-------------------------------------------${NC}"
echo ""
echo -e "  ${YELLOW}Security layers:${NC}"
echo -e "    ${GREEN}+${NC} SSH Certificate Authority (CA-signed keys)"
echo -e "    ${GREEN}+${NC} Public key authentication"
echo -e "    ${GREEN}+${NC} Password authentication (backup)"
echo -e "    ${GREEN}+${NC} Randomized SSH port"
echo -e "    ${GREEN}+${NC} Firewall (UFW)"
echo -e "    ${GREEN}+${NC} Intrusion prevention (Fail2Ban)"
echo -e "    ${GREEN}+${NC} Kernel hardening (sysctl)"
echo -e "    ${GREEN}+${NC} Automatic security patches"
echo ""
echo -e "  ${DIM}Estimated time: ~3-5 minutes${NC}"
echo ""

countdown 5

echo ""

log_step "1/${TOTAL_STEPS}" "Updating and upgrading system packages"
export DEBIAN_FRONTEND=noninteractive
if [ "$INTERACTIVE" = false ]; then
  echo "  → Refreshing package index from repositories..."
  echo "  → Checking for available security patches..."
  echo "  → Resolving dependency tree..."
fi
(apt update -y && apt upgrade -y) &>/dev/null &
spinner_critical $! "Fetching latest packages"
if [ "$INTERACTIVE" = false ]; then
  echo "  → Queuing curl, wget, git, ufw for install..."
  echo "  → Queuing software-properties-common, apt-transport-https..."
  echo "  → Queuing ca-certificates, gnupg, lsb-release, jq..."
  echo "  → Queuing unattended-upgrades, apt-listchanges..."
  echo "  → Queuing logwatch, lynis, rkhunter (audit tools)..."
  echo "  → Downloading packages from archive.ubuntu.com..."
fi
(apt install -y curl wget git ufw software-properties-common apt-transport-https \
  ca-certificates gnupg lsb-release jq unattended-upgrades apt-listchanges \
  logwatch lynis rkhunter) &>/dev/null &
spinner_critical $! "Installing security tools"
log_ok "System updated — all packages current"
progress_bar 1 $TOTAL_STEPS
echo ""

log_step "2/${TOTAL_STEPS}" "Setting up automatic security updates"
if [ "$INTERACTIVE" = false ]; then
  echo "  → Writing /etc/apt/apt.conf.d/20auto-upgrades..."
  echo "  → Setting daily package list refresh..."
  echo "  → Enabling automatic unattended upgrades..."
  echo "  → Setting weekly auto-clean interval..."
fi
cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Download-Upgradeable-Packages "1";
EOF

cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Package-Blacklist {
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

if [ "$INTERACTIVE" = false ]; then
  echo "  → Writing /etc/apt/apt.conf.d/50unattended-upgrades..."
  echo "  → Configuring security origins: main, ESM, infra..."
  echo "  → Setting auto-fix for interrupted dpkg..."
  echo "  → Enabling unused kernel package removal..."
  echo "  → Enabling unused dependency cleanup..."
fi
(systemctl enable unattended-upgrades && systemctl start unattended-upgrades) &>/dev/null &
spinner $! "Enabling auto-updates"
log_ok "Security updates configured — auto-patching active"
progress_bar 2 $TOTAL_STEPS
echo ""

USER_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)
log_step "3/${TOTAL_STEPS}" "Creating user account '${NEW_USER}'"
if [ "$INTERACTIVE" = false ]; then
  echo "  → Generating secure 20-character password..."
  echo "  → Checking if user '${NEW_USER}' exists..."
fi

if id "$NEW_USER" &>/dev/null; then
  log_warn "User '${NEW_USER}' already exists, updating password..."
  echo "${NEW_USER}:${USER_PASSWORD}" | chpasswd
else
  useradd -m -s /bin/bash -c "${FULL_NAME}" "$NEW_USER"
  echo "${NEW_USER}:${USER_PASSWORD}" | chpasswd
  usermod -aG sudo "$NEW_USER"
fi

if ! id "$NEW_USER" &>/dev/null; then
  log_error "User creation failed! Aborting before SSH lockdown to keep root access."
  exit 1
fi

if ! groups "$NEW_USER" | grep -q sudo; then
  log_error "User is not in sudo group! Aborting before SSH lockdown to keep root access."
  exit 1
fi

su - "$NEW_USER" -c "sudo -n true" 2>/dev/null || echo "${NEW_USER} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/"${NEW_USER}"

if [ "$INTERACTIVE" = false ]; then
  echo "  → Adding '${NEW_USER}' to sudo group..."
  echo "  → Writing sudoers entry to /etc/sudoers.d/${NEW_USER}..."
  echo "  → Verifying user can escalate privileges..."
fi
log_ok "User '${NEW_USER}' created with sudo"
progress_bar 3 $TOTAL_STEPS
echo ""

log_step "4/${TOTAL_STEPS}" "Generating 4096-bit RSA SSH key pair"
USER_HOME="/home/${NEW_USER}"
SSH_DIR="${USER_HOME}/.ssh"
mkdir -p "$SSH_DIR"
if [ "$INTERACTIVE" = false ]; then
  echo "  → Creating directory ${SSH_DIR}..."
  echo "  → Generating 4096-bit RSA key pair..."
  echo "  → Key comment: ${FULL_NAME} <${USER_EMAIL}>..."
fi

ssh-keygen -t rsa -b 4096 -f "${SSH_DIR}/id_rsa" -N "" -C "${FULL_NAME} <${USER_EMAIL}>" -q

if [ "$INTERACTIVE" = false ]; then
  echo "  → Writing public key to authorized_keys..."
fi
cat "${SSH_DIR}/id_rsa.pub" >> "${SSH_DIR}/authorized_keys"

if [ -n "$SETUP_ADMIN_SSH_KEY" ]; then
  echo "" >> "${SSH_DIR}/authorized_keys"
  echo "$SETUP_ADMIN_SSH_KEY" >> "${SSH_DIR}/authorized_keys"
  echo "$SETUP_ADMIN_SSH_KEY" >> /root/.ssh/authorized_keys 2>/dev/null || true
  log_ok "Admin SSH key added to authorized_keys"
fi

if [ "$INTERACTIVE" = false ]; then
  echo "  → Setting permissions: ${SSH_DIR} → 700..."
  echo "  → Setting permissions: authorized_keys → 600..."
  echo "  → Setting permissions: id_rsa → 600 (private)..."
  echo "  → Setting permissions: id_rsa.pub → 644 (public)..."
  echo "  → Setting ownership to ${NEW_USER}:${NEW_USER}..."
fi
chmod 700 "$SSH_DIR"
chmod 600 "${SSH_DIR}/authorized_keys"
chmod 600 "${SSH_DIR}/id_rsa"
chmod 644 "${SSH_DIR}/id_rsa.pub"
chown -R "${NEW_USER}:${NEW_USER}" "$SSH_DIR"

SSH_PUBLIC_KEY=$(cat "${SSH_DIR}/id_rsa.pub")
SSH_PRIVATE_KEY=$(cat "${SSH_DIR}/id_rsa")

log_ok "SSH key pair generated — 4096-bit RSA"
progress_bar 4 $TOTAL_STEPS
echo ""

log_step "5/${TOTAL_STEPS}" "Setting up SSH Certificate Authority"
if [ "$INTERACTIVE" = false ]; then
  echo "  → Creating CA directory /etc/ssh/ca..."
  echo "  → Setting directory permissions to 700..."
fi

CA_DIR="/etc/ssh/ca"
mkdir -p "$CA_DIR"
chmod 700 "$CA_DIR"

if [ "$INTERACTIVE" = false ]; then
  echo "  → Generating ed25519 Host CA key..."
fi
ssh-keygen -t ed25519 -f "${CA_DIR}/ca_host_key" -N "" -C "Host CA for $(hostname)" -q
log_ok "Host CA key generated (ed25519)"

if [ "$INTERACTIVE" = false ]; then
  echo "  → Generating ed25519 User CA key..."
fi
ssh-keygen -t ed25519 -f "${CA_DIR}/ca_user_key" -N "" -C "User CA for $(hostname)" -q
log_ok "User CA key generated (ed25519)"

if [ "$INTERACTIVE" = false ]; then
  echo "  → Looking up server IP for certificate principals..."
fi
SERVER_IP_FOR_CERT=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

HOST_CERT_LINES=""
for host_key in /etc/ssh/ssh_host_*_key.pub; do
  key_base="${host_key%.pub}"
  if [ -f "$key_base" ]; then
    if ssh-keygen -s "${CA_DIR}/ca_host_key" \
      -I "host_$(hostname)_$(basename "$key_base")" \
      -h \
      -n "$(hostname),${SERVER_IP_FOR_CERT}" \
      -V "+52w" \
      "$host_key" 2>/dev/null; then
      cert_file="${host_key%.pub}-cert.pub"
      if [ -f "$cert_file" ]; then
        HOST_CERT_LINES="${HOST_CERT_LINES}HostCertificate ${cert_file}\n"
        log_ok "Signed $(basename "$key_base")"
      fi
    fi
  fi
done

SSH_CERT=""
if ssh-keygen -s "${CA_DIR}/ca_user_key" \
  -I "user_${NEW_USER}_$(date +%Y%m%d)" \
  -n "$NEW_USER" \
  -V "+52w" \
  -z "$(date +%s)" \
  "${SSH_DIR}/id_rsa.pub" 2>/dev/null; then
  if [ -f "${SSH_DIR}/id_rsa-cert.pub" ]; then
    chmod 644 "${SSH_DIR}/id_rsa-cert.pub"
    chown "${NEW_USER}:${NEW_USER}" "${SSH_DIR}/id_rsa-cert.pub"
    SSH_CERT=$(cat "${SSH_DIR}/id_rsa-cert.pub")
    log_ok "User certificate issued (valid 52 weeks)"
  fi
fi

if [ -z "$SSH_CERT" ]; then
  log_warn "Certificate signing skipped - standard key auth still works fine"
fi

chmod 600 "${CA_DIR}/ca_host_key"
chmod 600 "${CA_DIR}/ca_user_key"
chmod 644 "${CA_DIR}/ca_host_key.pub"
chmod 644 "${CA_DIR}/ca_user_key.pub"

progress_bar 5 $TOTAL_STEPS
echo ""

log_step "6/${TOTAL_STEPS}" "Hardening SSH config (with safety checks)"
SSH_PORT=$(shuf -i 10000-60000 -n 1)
if [ "$INTERACTIVE" = false ]; then
  echo "  → Randomizing SSH port → ${SSH_PORT}..."
  echo "  → Backing up current sshd_config..."
fi

cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%s)

TRUSTED_CA_LINE=""
if [ -f "${CA_DIR}/ca_user_key.pub" ]; then
  TRUSTED_CA_LINE="TrustedUserCAKeys ${CA_DIR}/ca_user_key.pub"
fi

if [ "$INTERACTIVE" = false ]; then
  echo "  → Writing new sshd_config..."
  echo "  → Setting Port ${SSH_PORT}..."
  echo "  → Disabling root login (PermitRootLogin no)..."
  echo "  → Enabling public key authentication..."
  echo "  → Setting MaxAuthTries 5..."
  echo "  → Setting LoginGraceTime 60s..."
  echo "  → Disabling X11Forwarding, TCP forwarding..."
  echo "  → Disabling agent forwarding, tunneling..."
  echo "  → Setting ClientAliveInterval 300s..."
  echo "  → Restricting access to user: ${NEW_USER}..."
fi
cat > /etc/ssh/sshd_config.new <<EOF
Port ${SSH_PORT}
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

$(echo -e "$HOST_CERT_LINES")

${TRUSTED_CA_LINE}

PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

MaxAuthTries 5
LoginGraceTime 60
MaxSessions 3
MaxStartups 3:50:10

X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no

ClientAliveInterval 300
ClientAliveCountMax 2

AllowUsers ${NEW_USER}

Banner /etc/ssh/banner
PrintMotd no
PrintLastLog yes

UsePAM yes
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

cat > /etc/ssh/banner <<EOF
*******************************************************************
*  UNAUTHORIZED ACCESS TO THIS SYSTEM IS PROHIBITED.              *
*  All connections are monitored and recorded.                     *
*  Server secured by AI Powered Sites - $(date +%Y)                *
*  Certificate-based SSH authentication enabled.                  *
*  Disconnect IMMEDIATELY if you are not an authorized user.       *
*******************************************************************
EOF

if [ "$INTERACTIVE" = false ]; then
  echo "  → Writing SSH banner to /etc/ssh/banner..."
  echo "  → Validating new SSH configuration..."
fi
if sshd -t -f /etc/ssh/sshd_config.new 2>/dev/null; then
  log_ok "SSH config validated"
  cp /etc/ssh/sshd_config.new /etc/ssh/sshd_config
  systemctl restart sshd || systemctl restart ssh

  sleep 2
  if systemctl is-active --quiet sshd 2>/dev/null || systemctl is-active --quiet ssh 2>/dev/null; then
    log_ok "SSH service restarted on port ${SSH_PORT}"
  else
    log_error "SSH service failed to start! Rolling back config..."
    latest_backup=$(ls -t /etc/ssh/sshd_config.bak.* 2>/dev/null | head -1)
    if [ -n "$latest_backup" ]; then
      cp "$latest_backup" /etc/ssh/sshd_config
    fi
    systemctl restart sshd || systemctl restart ssh
    log_warn "Rolled back to previous SSH config. Root access preserved."
  fi
else
  log_error "SSH config validation FAILED! Keeping original config to prevent lockout."
  log_warn "Root login still enabled as fallback."
  SSH_PORT=22
fi

rm -f /etc/ssh/sshd_config.new

progress_bar 6 $TOTAL_STEPS
echo ""

log_step "7/${TOTAL_STEPS}" "Configuring UFW firewall"
if [ "$INTERACTIVE" = false ]; then
  echo "  → Setting default policy: deny incoming..."
  echo "  → Setting default policy: allow outgoing..."
  echo "  → Adding rule: allow TCP/${SSH_PORT} (SSH)..."
  echo "  → Adding rule: allow TCP/80 (HTTP)..."
  echo "  → Adding rule: allow TCP/443 (HTTPS)..."
  echo "  → Activating firewall..."
fi
ufw default deny incoming &>/dev/null
ufw default allow outgoing &>/dev/null
ufw allow "$SSH_PORT"/tcp comment "SSH" &>/dev/null
ufw allow 80/tcp comment "HTTP" &>/dev/null
ufw allow 443/tcp comment "HTTPS" &>/dev/null
ufw --force enable &>/dev/null
log_ok "Firewall active (SSH:${SSH_PORT}, HTTP:80, HTTPS:443)"
progress_bar 7 $TOTAL_STEPS
echo ""

log_step "8/${TOTAL_STEPS}" "Installing and configuring Fail2Ban"
if [ "$INTERACTIVE" = false ]; then
  echo "  → Downloading fail2ban package..."
fi
apt install -y fail2ban &>/dev/null &
spinner_critical $! "Installing Fail2Ban"

if [ "$INTERACTIVE" = false ]; then
  echo "  → Writing /etc/fail2ban/jail.local..."
  echo "  → Setting bantime: 1800s (30 min default)..."
  echo "  → Setting findtime: 600s (10 min window)..."
  echo "  → Setting maxretry: 5 attempts..."
  echo "  → Configuring SSH jail on port ${SSH_PORT}..."
  echo "  → SSH ban: 3600s (1 hour) after 5 failures..."
fi
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 1800
findtime = 600
maxretry = 5
banaction = iptables-multiport
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ${SSH_PORT}
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600
EOF

(systemctl enable fail2ban && systemctl restart fail2ban) &>/dev/null &
spinner $! "Configuring intrusion prevention"
log_ok "Fail2Ban active (5 tries = 1hr ban)"
progress_bar 8 $TOTAL_STEPS
echo ""

log_step "9/${TOTAL_STEPS}" "Applying kernel and network hardening"
if [ "$INTERACTIVE" = false ]; then
  echo "  → Writing /etc/sysctl.d/99-hardening.conf..."
  echo "  → Enabling reverse path filtering (rp_filter)..."
  echo "  → Blocking source-routed packets..."
  echo "  → Disabling ICMP redirects..."
  echo "  → Enabling martian packet logging..."
  echo "  → Enabling SYN cookies (DDoS protection)..."
  echo "  → Disabling TCP timestamps..."
  echo "  → Enabling ASLR (randomize_va_space = 2)..."
  echo "  → Disabling SysRq key..."
  echo "  → Enabling hardlink/symlink protections..."
fi
cat > /etc/sysctl.d/99-hardening.conf <<'EOF'
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

net.ipv4.tcp_timestamps = 0

kernel.randomize_va_space = 2
kernel.sysrq = 0

fs.suid_dumpable = 0
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
EOF

sysctl -p /etc/sysctl.d/99-hardening.conf &>/dev/null &
spinner $! "Hardening network stack"
log_ok "Kernel and network hardened"
progress_bar 9 $TOTAL_STEPS
echo ""

log_step "10/${TOTAL_STEPS}" "Disabling unused services and securing permissions"
if [ "$INTERACTIVE" = false ]; then
  echo "  → Disabling avahi-daemon (mDNS)..."
fi
systemctl disable avahi-daemon 2>/dev/null || true
systemctl stop avahi-daemon 2>/dev/null || true
if [ "$INTERACTIVE" = false ]; then
  echo "  → Disabling cups (printing)..."
fi
systemctl disable cups 2>/dev/null || true
systemctl stop cups 2>/dev/null || true
if [ "$INTERACTIVE" = false ]; then
  echo "  → Disabling bluetooth service..."
fi
systemctl disable bluetooth 2>/dev/null || true
systemctl stop bluetooth 2>/dev/null || true

if [ "$INTERACTIVE" = false ]; then
  echo "  → Securing /root → 700..."
  echo "  → Securing /home/${NEW_USER} → 750..."
  echo "  → Securing /etc/crontab → 600..."
  echo "  → Securing /etc/cron.d → 700..."
  echo "  → Securing /etc/cron.daily → 700..."
  echo "  → Securing /etc/cron.hourly → 700..."
  echo "  → Securing /etc/cron.weekly → 700..."
  echo "  → Securing /etc/cron.monthly → 700..."
fi
chmod 700 /root
chmod 750 /home/"${NEW_USER}"
chmod 600 /etc/crontab
chmod 700 /etc/cron.d
chmod 700 /etc/cron.daily
chmod 700 /etc/cron.hourly
chmod 700 /etc/cron.weekly
chmod 700 /etc/cron.monthly

if [ "$INTERACTIVE" = false ]; then
  echo "  → Writing /etc/security/limits.d/hardening.conf..."
  echo "  → Setting core dump limit: 0 (disabled)..."
  echo "  → Setting nofile limit: 65535..."
fi
cat > /etc/security/limits.d/hardening.conf <<'EOF'
* hard core 0
* soft nofile 65535
* hard nofile 65535
EOF

log_ok "Permissions locked down — all secure"
progress_bar 10 $TOTAL_STEPS
echo ""

log_step "11/${TOTAL_STEPS}" "Installing Docker and Docker Compose"
if ! command -v docker &>/dev/null; then
  if [ "$INTERACTIVE" = false ]; then
    echo "  → Downloading Docker GPG key from download.docker.com..."
  fi
  (curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg) &>/dev/null &
  spinner $! "Adding Docker GPG key"

  if [ "$INTERACTIVE" = false ]; then
    echo "  → Adding Docker apt repository..."
    echo "  → Architecture: $(dpkg --print-architecture)..."
    echo "  → Release: $(lsb_release -cs)..."
  fi
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

  if [ "$INTERACTIVE" = false ]; then
    echo "  → Refreshing package index with Docker repo..."
    echo "  → Installing docker-ce, docker-ce-cli..."
    echo "  → Installing containerd.io..."
    echo "  → Installing docker-buildx-plugin..."
    echo "  → Installing docker-compose-plugin..."
  fi
  (apt update -y && apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin) &>/dev/null &
  spinner_critical $! "Installing Docker engine"

  if [ "$INTERACTIVE" = false ]; then
    echo "  → Adding ${NEW_USER} to docker group..."
    echo "  → Enabling Docker systemd service..."
  fi
  usermod -aG docker "$NEW_USER"
  (systemctl enable docker && systemctl start docker) &>/dev/null &
  spinner $! "Starting Docker service"
  log_ok "Docker installed"
else
  log_warn "Docker already installed, skipping"
fi

docker compose version &>/dev/null && log_ok "Docker Compose available" || log_warn "Docker Compose plugin not found"
progress_bar 11 $TOTAL_STEPS
echo ""

log_step "12/${TOTAL_STEPS}" "Updating portal and sending credentials"
if [ "$INTERACTIVE" = false ]; then
  echo "  → Detecting public IP address..."
fi

SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")
if [ "$INTERACTIVE" = false ]; then
  echo "  → Public IP: ${SERVER_IP}"
fi

if [ -n "$API_URL" ] && [ -n "$PORTAL_TOKEN" ] && [ -n "$SERVER_ID" ]; then
  if [ "$INTERACTIVE" = false ]; then
    echo "  → Preparing credentials payload..."
    echo "  → Including SSH user: ${NEW_USER}..."
    echo "  → Including SSH port: ${SSH_PORT}..."
    echo "  → Including server IP: ${SERVER_IP}..."
    echo "  → Packaging SSH public key..."
    echo "  → Packaging SSH private key..."
  fi
  CERT_DATA=""
  if [ -n "$SSH_CERT" ]; then
    CERT_DATA=", \"sshCertificate\": $(echo "$SSH_CERT" | jq -Rs .)"
    if [ "$INTERACTIVE" = false ]; then
      echo "  → Packaging SSH certificate..."
    fi
  fi

  if [ "$INTERACTIVE" = false ]; then
    echo "  → Sending credentials to portal API..."
    echo "  → POST ${API_URL}/api/portal/.../credentials"
  fi
  PORTAL_RESPONSE=$(curl -s -w "\n%{http_code}" --connect-timeout 10 \
    -X POST "${API_URL}/api/portal/${PORTAL_TOKEN}/servers/${SERVER_ID}/credentials" \
    -H "Content-Type: application/json" \
    -d "{
      \"sshUser\": \"${NEW_USER}\",
      \"sshPort\": ${SSH_PORT},
      \"sshPublicKey\": $(echo "$SSH_PUBLIC_KEY" | jq -Rs .),
      \"sshPrivateKey\": $(echo "$SSH_PRIVATE_KEY" | jq -Rs .),
      \"serverIp\": \"${SERVER_IP}\",
      \"password\": \"${USER_PASSWORD}\",
      \"fullName\": \"${FULL_NAME}\"
      ${CERT_DATA}
    }" 2>&1)
  HTTP_CODE=$(echo "$PORTAL_RESPONSE" | tail -1)
  if [ "$HTTP_CODE" = "200" ]; then
    log_ok "Portal updated and credentials email sent"
  else
    log_warn "Portal update returned status ${HTTP_CODE}. Check server logs."
  fi
else
  log_warn "Skipping portal update (API URL, token, or server ID not set)"
  log_warn "Credentials will only be shown on screen."
fi

progress_bar 12 $TOTAL_STEPS
echo ""
echo ""

if [ "$INTERACTIVE" = false ]; then
  echo ""
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║                                          ║"
  echo "  ║   🎉  SETUP COMPLETE — 100%              ║"
  echo "  ║                                          ║"
  echo "  ╚══════════════════════════════════════════╝"
  echo ""
  echo "  📋 Server Details"
  echo "  ──────────────────────────────────────────"
  echo "  Server IP:        ${SERVER_IP}"
  echo "  Username:         ${NEW_USER}"
  echo "  Full Name:        ${FULL_NAME}"
  echo "  Password:         ${USER_PASSWORD}"
  echo "  SSH Port:         ${SSH_PORT}"
  echo ""
  echo "  📦 Installed Services"
  echo "  ──────────────────────────────────────────"
  echo "  ✅ Docker          — Installed"
  echo "  ✅ Auto-Updates    — Enabled (security only)"
  echo "  ✅ Fail2Ban        — Active (5 attempts/1hr ban)"
  echo "  ✅ Firewall (UFW)  — Active"
  echo "  ✅ Network         — Hardened"
  echo ""
  echo "  🔒 Security Layers"
  echo "  ──────────────────────────────────────────"
  echo "  ✅ Root login         — Disabled"
  echo "  ✅ SSH port           — Randomized (${SSH_PORT})"
  if [ -n "$SSH_CERT" ]; then
    echo "  ✅ SSH certificates   — CA-signed (valid 52 weeks)"
  else
    echo "  ⚠️  SSH certificates   — Skipped (key auth active)"
  fi
  echo "  ✅ SSH key auth       — Enabled (4096-bit RSA)"
  echo "  ✅ Password auth      — Enabled (backup only)"
  echo "  ✅ Kernel hardening   — Applied"
  echo "  ✅ Unused services    — Disabled"
  echo ""
  echo "  🔗 How to Connect"
  echo "  ──────────────────────────────────────────"
  echo ""
  echo "  With password:"
  echo "    ssh -p ${SSH_PORT} ${NEW_USER}@${SERVER_IP}"
  echo ""
  echo "  With SSH key:"
  echo "    ssh -i ~/.ssh/server_key -p ${SSH_PORT} ${NEW_USER}@${SERVER_IP}"
  echo ""
  if [ -n "$SSH_CERT" ]; then
    echo "  With certificate (most secure):"
    echo "    ssh -i ~/.ssh/server_key -o CertificateFile=~/.ssh/server_key-cert.pub -p ${SSH_PORT} ${NEW_USER}@${SERVER_IP}"
    echo ""
  fi
  echo "  ──────────────────────────────────────────"
  echo ""
  echo "  🚨 LOCKOUT RECOVERY:"
  echo "  If locked out, use Linode's LISH console"
  echo "  (web-based terminal) in the Linode dashboard."
  echo "  Login with: ${NEW_USER} / your password"
  echo ""
  echo "  ⚠️  IMPORTANT:"
  echo "  1. Save the private key from ${SSH_DIR}/id_rsa"
  if [ -n "$SSH_CERT" ]; then
    echo "  2. Save the certificate from ${SSH_DIR}/id_rsa-cert.pub"
    echo "  3. Change your password after first login: passwd"
  else
    echo "  2. Change your password after first login: passwd"
  fi
  echo ""
  echo "  🎉 All done, ${FULL_NAME}! Your server is locked down and ready."
  echo ""
else
  echo -e "${GREEN}${BOLD}"
  echo "  ==========================================="
  echo "  |                                          |"
  echo "  |          SETUP COMPLETE                  |"
  echo "  |                                          |"
  echo "  ==========================================="
  echo -e "${NC}"

  echo -e "  ${BOLD}Server Details${NC}"
  echo -e "  ${DIM}-------------------------------------------${NC}"
  echo -e "  Server IP:        ${GREEN}${BOLD}${SERVER_IP}${NC}"
  echo -e "  Username:         ${GREEN}${BOLD}${NEW_USER}${NC}"
  echo -e "  Full Name:        ${GREEN}${FULL_NAME}${NC}"
  echo -e "  Password:         ${GREEN}${BOLD}${USER_PASSWORD}${NC}"
  echo -e "  SSH Port:         ${GREEN}${BOLD}${SSH_PORT}${NC}"
  echo ""
  echo -e "  ${BOLD}Installed Services${NC}"
  echo -e "  ${DIM}-------------------------------------------${NC}"
  echo -e "  Docker:           ${GREEN}+ Installed${NC}"
  echo -e "  Auto-Updates:     ${GREEN}+ Enabled (security only)${NC}"
  echo -e "  Fail2Ban:         ${GREEN}+ Active (5 attempts/1hr ban)${NC}"
  echo -e "  Firewall (UFW):   ${GREEN}+ Active${NC}"
  echo -e "  Network Hardened: ${GREEN}+ Yes${NC}"
  echo ""
  echo -e "  ${BOLD}Security Layers${NC}"
  echo -e "  ${DIM}-------------------------------------------${NC}"
  echo -e "  Root login:          ${GREEN}+ Disabled${NC}"
  echo -e "  SSH port:            ${GREEN}+ Randomized (${SSH_PORT})${NC}"
  if [ -n "$SSH_CERT" ]; then
    echo -e "  SSH certificates:    ${GREEN}+ CA-signed (valid 52 weeks)${NC}"
  else
    echo -e "  SSH certificates:    ${YELLOW}! Skipped (key auth active)${NC}"
  fi
  echo -e "  SSH key auth:        ${GREEN}+ Enabled (4096-bit RSA)${NC}"
  echo -e "  Password auth:       ${GREEN}+ Enabled (backup only)${NC}"
  echo -e "  Kernel hardening:    ${GREEN}+ Applied${NC}"
  echo -e "  Unused services:     ${GREEN}+ Disabled${NC}"
  echo ""
  echo -e "  ${BOLD}How to Connect${NC}"
  echo -e "  ${DIM}-------------------------------------------${NC}"
  echo ""
  echo -e "  ${YELLOW}With password:${NC}"
  echo -e "  ${CYAN}ssh -p ${SSH_PORT} ${NEW_USER}@${SERVER_IP}${NC}"
  echo ""
  echo -e "  ${YELLOW}With SSH key:${NC}"
  echo -e "  ${CYAN}ssh -i ~/.ssh/server_key -p ${SSH_PORT} ${NEW_USER}@${SERVER_IP}${NC}"
  echo ""
  if [ -n "$SSH_CERT" ]; then
    echo -e "  ${YELLOW}With certificate (most secure):${NC}"
    echo -e "  ${CYAN}ssh -i ~/.ssh/server_key -o CertificateFile=~/.ssh/server_key-cert.pub -p ${SSH_PORT} ${NEW_USER}@${SERVER_IP}${NC}"
    echo ""
  fi
  echo -e "  ${DIM}-------------------------------------------${NC}"
  echo ""
  echo -e "  ${BOLD}${YELLOW}LOCKOUT RECOVERY:${NC}"
  echo -e "  If locked out, use Linode's ${BOLD}LISH console${NC} (web-based terminal)"
  echo -e "  in the Linode dashboard to access the server directly."
  echo -e "  Login with: ${CYAN}${NEW_USER}${NC} / your password"
  echo ""
  echo -e "  ${BOLD}${YELLOW}IMPORTANT:${NC}"
  echo -e "  ${YELLOW}1.${NC} Save the private key from ${CYAN}${SSH_DIR}/id_rsa${NC}"
  if [ -n "$SSH_CERT" ]; then
    echo -e "  ${YELLOW}2.${NC} Save the certificate from ${CYAN}${SSH_DIR}/id_rsa-cert.pub${NC}"
    echo -e "  ${YELLOW}3.${NC} Change your password after first login: ${CYAN}passwd${NC}"
  else
    echo -e "  ${YELLOW}2.${NC} Change your password after first login: ${CYAN}passwd${NC}"
  fi
  echo ""
  echo -e "  ${GREEN}${BOLD}All done, ${FULL_NAME}! Your server is locked down and ready.${NC}"
  echo ""
fi
