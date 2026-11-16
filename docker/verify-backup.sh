#!/usr/bin/env bash
# Prove a database backup is restorable: load it into a THROWAWAY MariaDB container and check it.
# Touches nothing that is running. Needs only Docker.
#
#   docker/verify-backup.sh /var/backups/noagenda/db-20261115-031500.sql.gz
#   docker/verify-backup.sh                      # newest db-*.sql.gz in ./backups (or $BACKUP_DIR)
#
# Run it from cron weekly on the newest backup and you will notice a broken backup in days, not in an emergency.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP="${1:-$(ls -1t "${BACKUP_DIR:-$HERE/../backups}"/db-*.sql.gz 2>/dev/null | head -1 || true)}"
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "No backup file given or found." >&2; exit 2; }

NAME="noagenda-verify-$$"
PW="$(openssl rand -hex 10)"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Backup: $DUMP ($(du -h "$DUMP" | cut -f1), $(stat -c %y "$DUMP" | cut -d. -f1))"
gzip -t "$DUMP" || { echo "FAIL: the file is not a valid gzip archive"; exit 1; }

docker run -d --name "$NAME" -e MARIADB_ROOT_PASSWORD="$PW" -e MARIADB_DATABASE=verify mariadb:11.8 >/dev/null
for i in $(seq 1 60); do
  docker exec "$NAME" mariadb -uroot -p"$PW" -e 'SELECT 1' >/dev/null 2>&1 && break
  [ "$i" -eq 60 ] && { echo "FAIL: scratch database did not start" >&2; exit 1; }
  sleep 2
done

echo "Restoring into a scratch database..."
gzip -dc "$DUMP" | docker exec -i "$NAME" mariadb -uroot -p"$PW" verify

q() { docker exec "$NAME" mariadb -uroot -p"$PW" verify -N -e "$1"; }

# Is this even a NOAgenda database? Say so clearly instead of failing on a raw SQL error.
missing=""
for t in users nodes migrations comments user_sessions; do
  [ "$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='verify' AND table_name='$t'")" = "1" ] || missing="$missing $t"
done
if [ -n "$missing" ]; then
  echo "FAIL: this does not look like a NOAgenda database (missing tables:$missing)"
  exit 1
fi

tables="$(q "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='verify'")"
users="$(q 'SELECT COUNT(*) FROM users')"
nodes="$(q 'SELECT COUNT(*) FROM nodes')"
migs="$(q 'SELECT COUNT(*) FROM migrations')"
latest="$(q 'SELECT name FROM migrations ORDER BY id DESC LIMIT 1')"
newest_user="$(q 'SELECT IFNULL(MAX(createdAt), "none") FROM users')"

echo "  tables: $tables | users: $users | projects+tasks: $nodes | migrations applied: $migs (latest: $latest)"
echo "  newest account created: $newest_user"

status=0
[ "$tables" -ge 25 ] || { echo "FAIL: only $tables tables restored (expected 25+)"; status=1; }
[ "$migs" -ge 1 ] || { echo "FAIL: no migrations recorded: this does not look like a NOAgenda database"; status=1; }
[ "$status" -eq 0 ] && echo "OK: the backup restores cleanly." || echo "The backup is NOT usable."
exit $status
