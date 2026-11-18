#!/usr/bin/env bash
# Pull prebuilt images and restart the production stack (no building on the server).
#
#   docker/deploy.sh [image_tag]        # default: latest; CI tags every image with the commit SHA
#
# Env: ENV_FILE (default docker/.env.production), COMPOSE_FILE, BACKUP_DIR (default /var/backups/noagenda).
# The chosen tag is stored as IMAGE_TAG in the env file, so restarts keep using the same version.
# If the new version does not become healthy, the previous tag is started again. Note that database
# migrations only go forward: a rollback to older code can need the pre-deploy backup (docker/restore.sh).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$HERE/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$HERE/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/noagenda}"
TAG="${1:-latest}"
DC=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

prev="$(grep -E '^IMAGE_TAG=' "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
set_tag() {
  if grep -q '^IMAGE_TAG=' "$ENV_FILE"; then sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$1|" "$ENV_FILE"; else echo "IMAGE_TAG=$1" >> "$ENV_FILE"; fi
}
healthy() {
  for _ in $(seq 1 30); do
    "${DC[@]}" exec -T backend wget -qO- http://127.0.0.1:3000/health >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

# Back up first when the stack is already running (migrations run on start and cannot be undone).
if [ -n "$("${DC[@]}" ps -q mariadb 2>/dev/null)" ]; then
  "$HERE/backup.sh" "$BACKUP_DIR"
fi

set_tag "$TAG"
"${DC[@]}" pull backend frontend
"${DC[@]}" up -d --no-build --remove-orphans

if healthy; then
  docker image prune -f >/dev/null
  echo "Deployed tag: $TAG"
else
  echo "New version is not healthy; check: ${DC[*]} logs backend" >&2
  if [ -n "$prev" ] && [ "$prev" != "$TAG" ]; then
    echo "Rolling back to tag: $prev" >&2
    set_tag "$prev"
    "${DC[@]}" up -d --no-build
  fi
  exit 1
fi
