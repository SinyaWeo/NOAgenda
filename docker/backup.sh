#!/usr/bin/env bash
# Back up the database and uploaded files of the production stack.
#
#   docker/backup.sh [backup_dir]
#
# Env: ENV_FILE (default docker/.env.production), COMPOSE_FILE, COMPOSE_PROJECT,
#      KEEP_DAYS (default 14; older backups are deleted).
# Cron example (daily 03:15):  15 3 * * * /opt/noagenda/docker/backup.sh /var/backups/noagenda
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$HERE/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$HERE/.env.production}"
BACKUP_DIR="${1:-$HERE/../backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
DC=(docker compose ${COMPOSE_PROJECT:+-p "$COMPOSE_PROJECT"} -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

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

find "$BACKUP_DIR" -maxdepth 1 \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete
echo "Backup written: $db ($(du -h "$db" | cut -f1)), $up ($(du -h "$up" | cut -f1))"
