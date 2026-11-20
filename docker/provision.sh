#!/usr/bin/env bash
# Prepare a Debian or Ubuntu VPS to run the NOAgenda production stack.
#
#   sudo docker/provision.sh [--firewall] [--ssh-harden] [--dry-run]
#
# Safe to re-run: every step checks what is already there. By default it does NOT change the firewall or the SSH
# daemon, because on a server that already hosts other things those are the two steps that can lock you out or break
# another service. Enable them explicitly once you have read what they do:
#
#   --firewall     ufw: deny incoming except your SSH port, 80 and 443. (Docker bypasses ufw for published ports;
#                  the compose file only publishes Caddy, so that is fine.)
#   --ssh-harden   no password logins; root only with a key. Refuses to run unless a key is already installed.
#                  KEEP YOUR CURRENT SESSION OPEN and test a second login before you close it.
#   --dry-run      print what would be done, change nothing (works without root).
#
# What it does: checks KVM + RAM, installs packages (git, curl, ufw, rclone, unattended-upgrades), clears old kernels
# (a full /boot breaks apt), turns on time sync, adds swap on small servers, installs Docker + the Compose plugin
# with log rotation, creates the app user and directory, and enables automatic security updates.
# It does not touch Apache/nginx, your DNS, or your secrets.
#
# Env: APP_USER (default noagenda), APP_DIR (default /opt/noagenda), SWAP_SIZE (default 2G, used when swap < 1 GB),
#      REPO_URL (optional: cloned into APP_DIR if that directory is empty).
set -euo pipefail

APP_USER="${APP_USER:-noagenda}"
APP_DIR="${APP_DIR:-/opt/noagenda}"
SWAP_SIZE="${SWAP_SIZE:-2G}"
REPO_URL="${REPO_URL:-}"
DO_FIREWALL=0
DO_SSH=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --firewall) DO_FIREWALL=1 ;;
    --ssh-harden) DO_SSH=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $arg (see --help)" >&2; exit 2 ;;
  esac
done

log() { printf '\n== %s\n' "$*"; }
note() { printf '   %s\n' "$*"; }
warn() { printf '   WARNING: %s\n' "$*" >&2; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Runs a command, or only prints it in --dry-run.
run() { if [ "$DRY_RUN" = 1 ]; then printf '   + %s\n' "$*"; else "$@"; fi; }

# write_file <path> [mode]: content comes from stdin.
write_file() {
  local path="$1" mode="${2:-644}"
  if [ "$DRY_RUN" = 1 ]; then
    printf '   + write %s (mode %s):\n' "$path" "$mode"
    sed 's/^/       | /'
  else
    install -d "$(dirname "$path")"
    cat > "$path"
    chmod "$mode" "$path"
  fi
}

[ "$DRY_RUN" = 1 ] || [ "$(id -u)" -eq 0 ] || die "run as root (sudo docker/provision.sh), or add --dry-run to preview"

# shellcheck disable=SC1091
. /etc/os-release
case "${ID:-}" in
  debian|ubuntu) ;;
  *) die "only Debian and Ubuntu are supported (this is: ${PRETTY_NAME:-unknown})" ;;
esac
export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------------------------------------------------------
log "1/9 Checking the machine"
virt="$(systemd-detect-virt 2>/dev/null || true)"
mem_mb="$(awk '/^MemTotal:/ {print int($2/1024)}' /proc/meminfo)"
swap_mb="$(awk '/^SwapTotal:/ {print int($2/1024)}' /proc/meminfo)"
note "OS: ${PRETTY_NAME}   virtualisation: ${virt:-unknown}   RAM: ${mem_mb} MB   swap: ${swap_mb} MB"
if [ "$virt" != "kvm" ]; then
  warn "virtualisation is '${virt:-unknown}', not 'kvm'. Docker can misbehave on OpenVZ/LXC containers."
fi
if [ "$mem_mb" -lt 900 ]; then warn "under 1 GB of RAM: this stack will not fit"; fi
listeners="$( (ss -ltnH '( sport = :80 or sport = :443 )' 2>/dev/null || true) | awk '{print $4}' | tr '\n' ' ')"
if [ -n "$listeners" ]; then
  note "Something already listens on: ${listeners}"
  note "-> use the 'Behind an existing Apache' mode in DEPLOYMENT.md (shared Caddy on 127.0.0.1:8080); do not free those ports."
fi

# ---------------------------------------------------------------------------------------------------------------
log "2/9 Packages"
run apt-get update -y
run apt-get install -y --no-install-recommends ca-certificates curl gnupg git ufw rclone unattended-upgrades

# ---------------------------------------------------------------------------------------------------------------
log "3/9 Old kernels and /boot"
# A full /boot makes kernel upgrades fail half way. autoremove never removes the running kernel.
boot_use="$(df --output=pcent /boot 2>/dev/null | tail -1 | tr -dc '0-9' || true)"
note "/boot is ${boot_use:-?}% full"
run apt-get autoremove --purge -y
run apt-get clean

# ---------------------------------------------------------------------------------------------------------------
log "4/9 Time sync"
# Certificates and tokens depend on the clock.
run timedatectl set-ntp true || warn "could not enable NTP; check 'timedatectl status'"

# ---------------------------------------------------------------------------------------------------------------
log "5/9 Swap"
if [ "$swap_mb" -ge 1024 ]; then
  note "already ${swap_mb} MB of swap: nothing to do"
elif [ -e /swapfile ]; then
  note "/swapfile exists but is not active; leaving it alone (check: swapon --show, /etc/fstab)"
else
  case "$SWAP_SIZE" in
    *[Gg]) swap_target_mb=$(( ${SWAP_SIZE%[Gg]} * 1024 )) ;;
    *[Mm]) swap_target_mb="${SWAP_SIZE%[Mm]}" ;;
    *) die "SWAP_SIZE must look like 2G or 1024M (got: ${SWAP_SIZE})" ;;
  esac
  note "adding a ${SWAP_SIZE} swap file (safety net against out-of-memory kills)"
  run fallocate -l "$SWAP_SIZE" /swapfile || run dd if=/dev/zero of=/swapfile bs=1M count="$swap_target_mb" status=none
  run chmod 600 /swapfile
  run mkswap /swapfile
  run swapon /swapfile
  if ! grep -qs '^/swapfile ' /etc/fstab; then
    if [ "$DRY_RUN" = 1 ]; then note "+ append '/swapfile none swap sw 0 0' to /etc/fstab"; else echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi
  fi
fi
printf 'vm.swappiness=10\n' | write_file /etc/sysctl.d/99-noagenda-swap.conf
run sysctl -q --system

# ---------------------------------------------------------------------------------------------------------------
log "6/9 Docker"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  note "Docker and the Compose plugin are already installed: $(docker --version)"
else
  run install -m 0755 -d /etc/apt/keyrings
  run curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  run chmod a+r /etc/apt/keyrings/docker.asc
  codename="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
  [ -n "$codename" ] || die "cannot determine the release codename"
  arch="$(dpkg --print-architecture)"
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/%s %s stable\n' \
    "$arch" "$ID" "$codename" | write_file /etc/apt/sources.list.d/docker.list
  run apt-get update -y
  run apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
# Default log rotation for every container (the compose file also sets it per service). Never overwrites your file.
if [ -e /etc/docker/daemon.json ]; then
  note "/etc/docker/daemon.json exists: left unchanged (make sure it rotates logs: max-size 10m, max-file 3)"
else
  write_file /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
  run systemctl restart docker
fi
run systemctl enable --now docker

# ---------------------------------------------------------------------------------------------------------------
log "7/9 App user and directory"
if id "$APP_USER" >/dev/null 2>&1; then
  note "user ${APP_USER} exists"
else
  run useradd --create-home --shell /bin/bash "$APP_USER"
fi
# Note: membership of the docker group is equivalent to root on this machine.
run usermod -aG docker "$APP_USER"
run install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
# Convenience: if you log in as root with a key today, the same key works for the app user. Adds access only.
if [ -s /root/.ssh/authorized_keys ] && [ ! -s "/home/${APP_USER}/.ssh/authorized_keys" ]; then
  note "copying root's authorized_keys to ${APP_USER}"
  run install -d -m 700 -o "$APP_USER" -g "$APP_USER" "/home/${APP_USER}/.ssh"
  run install -m 600 -o "$APP_USER" -g "$APP_USER" /root/.ssh/authorized_keys "/home/${APP_USER}/.ssh/authorized_keys"
fi
if [ -n "$REPO_URL" ]; then
  if [ -z "$(ls -A "$APP_DIR" 2>/dev/null || true)" ]; then
    run runuser -u "$APP_USER" -- git clone "$REPO_URL" "$APP_DIR"
  else
    note "${APP_DIR} is not empty: not cloning"
  fi
fi

# ---------------------------------------------------------------------------------------------------------------
log "8/9 Automatic security updates"
if [ -e /etc/apt/apt.conf.d/20auto-upgrades ]; then
  note "already configured"
else
  write_file /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF
fi

# ---------------------------------------------------------------------------------------------------------------
log "9/9 Firewall and SSH"
ssh_port="$(sshd -T 2>/dev/null | awk '/^port / {print $2; exit}' || true)"
ssh_port="${ssh_port:-22}"

if [ "$DO_FIREWALL" = 1 ]; then
  note "ufw: deny incoming except SSH (${ssh_port}), 80 and 443"
  run ufw default deny incoming
  run ufw default allow outgoing
  run ufw allow "${ssh_port}/tcp"
  run ufw allow 80/tcp
  run ufw allow 443/tcp
  run ufw --force enable
else
  note "firewall untouched (re-run with --firewall). SSH is on port ${ssh_port}; if other services on this server need"
  note "other ports (mail, a database...), allow them in ufw first."
fi

if [ "$DO_SSH" = 1 ]; then
  have_key=0
  for f in /root/.ssh/authorized_keys "/home/${APP_USER}/.ssh/authorized_keys"; do [ -s "$f" ] && have_key=1; done
  [ "$DRY_RUN" = 1 ] && have_key=1
  [ "$have_key" = 1 ] || die "no SSH key is installed for root or ${APP_USER}: refusing to disable password logins (you would be locked out)"
  grep -qs '^Include /etc/ssh/sshd_config.d/' /etc/ssh/sshd_config || [ "$DRY_RUN" = 1 ] \
    || die "/etc/ssh/sshd_config has no 'Include /etc/ssh/sshd_config.d/*.conf' line (older distribution)"
  note "ssh: password logins off, root only with a key"
  # sshd uses the FIRST value it sees and reads the directory alphabetically, so this must sort before cloud-init's 50-*.
  write_file /etc/ssh/sshd_config.d/00-noagenda.conf <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
CONF
  run sshd -t
  run systemctl reload ssh
  note "Open a SECOND terminal and log in with your key before closing this one."
else
  note "SSH daemon untouched (re-run with --ssh-harden once key login works)"
fi

# ---------------------------------------------------------------------------------------------------------------
log "Done. Next steps"
note "1. Log in as ${APP_USER} (docker group membership needs a fresh login)."
note "2. Get the code into ${APP_DIR}:  git clone <repo> ${APP_DIR}   (or REPO_URL=... when running this script)"
note "3. cd ${APP_DIR} && cp docker/.env.production.example docker/.env.production && chmod 600 docker/.env.production"
note "4. If the GHCR packages are private:  echo <token with read:packages> | docker login ghcr.io -u <github-user> --password-stdin"
note "5. docker/preflight.sh config docker/.env.production && docker/deploy.sh"
if [ "$mem_mb" -lt 1800 ]; then
  note ""
  note "Small server (${mem_mb} MB RAM): add these to docker/.env.production, then watch 'docker stats --no-stream':"
  note "   MARIADB_BUFFER_POOL=128M"
  note "   BACKEND_MEM_LIMIT=384m"
  note "   FRONTEND_MEM_LIMIT=256m"
  note "   (and CADDY_MEM_LIMIT=128m in docker/.env.edge)"
fi
