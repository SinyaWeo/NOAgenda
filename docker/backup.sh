#!/usr/bin/env bash
# Back up the database and uploaded files of the production stack.
#
#   docker/backup.sh [backup_dir]
#
# Env: ENV_FILE (default docker/.env.production), COMPOSE_FILE, COMPOSE_PROJECT,
#      KEEP_DAYS (default 14; older backups are deleted).
#      BACKUP_RCLONE_REMOTE  optional rclone destination for an off-server copy (e.g. b2:bucket/noagenda).
#                       Remote retention is yours to set (bucket lifecycle rule); KEEP_DAYS only prunes local files.
#      BACKUP_PING_URL  optional "dead man's switch" (healthchecks.io, Uptime Kuma, ...): GET <url> after a
#                       successful backup and <url>/fail after a failed one. If the pings stop, you are
#                       alerted that backups are no longer running.
# Cron example (daily 03:15):  15 3 * * * /opt/noagenda/docker/backup.sh /var/backups/noagenda
#
# The dump does NOT contain SECRETS_KEY (it lives in the env file), so the webhook secrets in it are unreadable on
# their own. Keep a copy of docker/.env.production apart from these backups: a restore needs the same key.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$HERE/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$HERE/.env.production}"
BACKUP_DIR="${1:-$HERE/../backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
DC=(docker compose ${COMPOSE_PROJECT:+-p "$COMPOSE_PROJECT"} -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

ping() { [ -n "${BACKUP_PING_URL:-}" ] && curl -fsS -m 10 --retry 3 -o /dev/null "$BACKUP_PING_URL$1" || true; }
trap 'ping /fail' ERR

umask 077
mkdir -p "$BACKUP_DIR"
ts="$(date +%Y%m%d-%H%M%S)"
db="$BACKUP_DIR/db-$ts.sql.gz"
up="$BACKUP_DIR/uploads-$ts.tar.gz"

# --single-transaction = consistent snapshot without locking the app.
"${DC[@]}" exec -T mariadb sh -c \
  'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --events "$MARIADB_DATABASE"' \
  | gzip > "$db.part"
"${DC[@]}" exec -T backend tar -C /app -czf - uploads > "$up.part"

# Only keep a backup that is a valid archive and not empty.
gzip -t "$db.part" && gzip -t "$up.part"
[ "$(gzip -dc "$db.part" | grep -c 'CREATE TABLE')" -gt 0 ] || { echo "dump looks empty, aborting" >&2; rm -f "$db.part" "$up.part"; exit 1; }
mv "$db.part" "$db"; mv "$up.part" "$up"

# Optional off-server copy (a backup that lives only on the server dies with it). Needs rclone configured
# for the remote, e.g. BACKUP_RCLONE_REMOTE=b2:my-bucket/noagenda. A failure here triggers the /fail ping.
if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  rclone copy "$db" "$BACKUP_RCLONE_REMOTE"
  rclone copy "$up" "$BACKUP_RCLONE_REMOTE"
fi

find "$BACKUP_DIR" -maxdepth 1 \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete
ping ""
echo "Backup written: $db ($(du -h "$db" | cut -f1)), $up ($(du -h "$up" | cut -f1))"
