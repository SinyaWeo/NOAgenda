#!/usr/bin/env bash
# Reset the public demo instance to its default example data (run nightly from cron or a systemd timer).
#
#   0 0 * * *  ENV_FILE=/opt/noagenda/demo.env COMPOSE_PROJECT=noagenda-demo /opt/noagenda/docker/demo-reset.sh
#
# Env: ENV_FILE, COMPOSE_FILE, COMPOSE_PROJECT (default noagenda-demo).
# Re-creates the example users and their data (seed --reset), deletes uploaded files and sessions.
# Never point this at the real instance: it deletes data. It refuses unless DEMO_MODE=true is set in the env file.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$HERE/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$HERE/.env.demo}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-noagenda-demo}"
DC=(docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

grep -Eq '^DEMO_MODE=true' "$ENV_FILE" || { echo "Refusing: DEMO_MODE=true is not set in $ENV_FILE" >&2; exit 2; }

"${DC[@]}" exec -T -e ALLOW_DEMO_SEED=true backend node dist/scripts/seed.js --reset
# Uploaded attachments and avatars (the seed has none); keep the directory itself.
"${DC[@]}" exec -T backend sh -c 'find /app/uploads -mindepth 1 -delete; mkdir -p /app/uploads/avatars'
echo "Demo reset: $(date -Is)"
