#!/usr/bin/env bash
# Restore a backup made by backup.sh. DESTROYS the current database contents.
#
#   docker/restore.sh <db-*.sql.gz> [uploads-*.tar.gz]
#
# Env: ENV_FILE, COMPOSE_FILE, COMPOSE_PROJECT, ASSUME_YES=1 (skip the prompt).
#
# Secrets in the database (webhook signing secrets) are encrypted with SECRETS_KEY, which is not in the backup.
# The env file must hold the key that was in use when the backup was taken (after a rotation: still list the old
# key, then run reencrypt-secrets.js). Otherwise those secrets cannot be read and have to be re-entered.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$HERE/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$HERE/.env.production}"
DB_DUMP="${1:?usage: restore.sh <db-*.sql.gz> [uploads-*.tar.gz]}"
UPLOADS="${2:-}"
DC=(docker compose ${COMPOSE_PROJECT:+-p "$COMPOSE_PROJECT"} -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

[ -f "$DB_DUMP" ] || { echo "no such file: $DB_DUMP" >&2; exit 1; }
gzip -t "$DB_DUMP"
if [ "${ASSUME_YES:-}" != "1" ]; then
  read -r -p "This REPLACES the current database${UPLOADS:+ and uploads}. Type 'restore' to continue: " a
  [ "$a" = "restore" ] || { echo "aborted"; exit 1; }
fi

"${DC[@]}" stop backend frontend
# The dump contains DROP TABLE IF EXISTS + CREATE TABLE for every table.
gzip -dc "$DB_DUMP" | "${DC[@]}" exec -T mariadb sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"'
if [ -n "$UPLOADS" ]; then
  gzip -t "$UPLOADS"
  # Runs as the image's own user (node), who owns the volume: the hardened container has no capabilities,
  # so root could neither chown nor remove node's files. `find -delete` also removes dotfiles.
  "${DC[@]}" run --rm --no-deps -T --entrypoint sh backend -c 'find /app/uploads -mindepth 1 -delete && tar -C /app --no-same-owner -xzf -' < "$UPLOADS"
fi
"${DC[@]}" start backend frontend
echo "Restore complete."
echo "Note: stored secrets need the SECRETS_KEY that was in use when this backup was taken (see DEPLOYMENT.md)."
