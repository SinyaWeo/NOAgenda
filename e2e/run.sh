#!/usr/bin/env bash
# Build and start the PRODUCTION stack in an isolated project, run the real-browser test
# against it, and tear everything down again.
#
#   e2e/run.sh              # local or CI
#   KEEP=1 e2e/run.sh       # leave the stack running afterwards (https://localhost:8443)
#
# Needs: docker (+ compose plugin), node >= 20. First run downloads Chromium (~130 MB).
# Everything it creates (containers, volumes, images, a random secrets file) is removed
# at the end; screenshots of failures go to e2e/artifacts/.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
PROJECT="noagenda-e2e"
HTTPS_PORT="${HTTPS_PORT:-8443}"
WORK="$(mktemp -d)"
ENV_FILE="$WORK/stack.env"

# Throwaway secrets, different on every run.
cat > "$ENV_FILE" <<ENV
DOMAIN=localhost
INSTANCE=e2e
PUBLIC_ORIGIN=https://localhost:${HTTPS_PORT}
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 12)
MYSQL_PASSWORD=$(openssl rand -hex 12)
JWT_SECRET=$(openssl rand -hex 48)
SECRETS_KEY=$(openssl rand -base64 32)
OPERATOR_NAME=Example Ltd, Prague
CONTACT_EMAIL=privacy@example.test
REQUIRE_TERMS_ACCEPTANCE=true
ENV

# The shared reverse proxy (own project) in front of the stack, with a throwaway site file.
SITES="$WORK/sites"; mkdir -p "$SITES"; chmod 755 "$SITES"   # the container runs without DAC_OVERRIDE
printf 'localhost {\n\timport noagenda e2e\n}\n' > "$SITES/e2e.caddy"
chmod 644 "$SITES/e2e.caddy"
EDGE_ENV="$WORK/edge.env"
printf 'HTTP_PORT=%s\nHTTPS_PORT=%s\nSITES_DIR=%s\n' "${HTTP_PORT:-8088}" "$HTTPS_PORT" "$SITES" > "$EDGE_ENV"
EDGE=(docker compose -p noagenda-e2e-edge -f "$ROOT/docker/docker-compose.edge.yml" --env-file "$EDGE_ENV")

DC=(docker compose -p "$PROJECT" -f "$ROOT/docker/docker-compose.prod.yml" -f "$HERE/docker-compose.e2e.yml" --env-file "$ENV_FILE")

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "--- container logs (last 80 lines each) ---"
    mkdir -p "$HERE/artifacts"
    { "${DC[@]}" logs --no-color; "${EDGE[@]}" logs --no-color; } > "$HERE/artifacts/stack.log" 2>&1 || true
    "${DC[@]}" logs --no-color --tail 80 backend frontend 2>&1 || true
    "${EDGE[@]}" logs --no-color --tail 80 caddy 2>&1 || true
  fi
  if [ "${KEEP:-}" = "1" ]; then
    echo "Stack left running at https://localhost:${HTTPS_PORT} (project $PROJECT). Remove with:"
    echo "  docker compose -p $PROJECT -f docker/docker-compose.prod.yml -f e2e/docker-compose.e2e.yml --env-file $ENV_FILE down -v --rmi local"
    echo "  docker compose -p noagenda-e2e-edge -f docker/docker-compose.edge.yml --env-file $EDGE_ENV down -v"
  else
    "${DC[@]}" down -v --rmi local >/dev/null 2>&1 || true
    "${EDGE[@]}" down -v >/dev/null 2>&1 || true
    rm -rf "$WORK"
  fi
  exit "$status"
}
trap cleanup EXIT

echo "== starting the shared proxy and building the production stack"
"${EDGE[@]}" up -d
"${DC[@]}" up -d --build

echo "== waiting for the stack"
for i in $(seq 1 90); do
  if curl -fsk "https://localhost:${HTTPS_PORT}/api/health" 2>/dev/null | grep -q '"ok"' \
     && curl -fsk -o /dev/null "https://localhost:${HTTPS_PORT}/user/login" 2>/dev/null; then
    break
  fi
  [ "$i" -eq 90 ] && { echo "stack did not become healthy" >&2; exit 1; }
  sleep 2
done

echo "== installing the browser test dependencies"
cd "$HERE"
npm ci --no-audit --no-fund
if [ "${CI:-}" = "true" ]; then npx playwright install --with-deps chromium; else npx playwright install chromium; fi

echo "== running the browser test"
# The throwaway stack uses Caddy's self-signed certificate; the browser is told to accept it, and so must node's fetch.
NODE_TLS_REJECT_UNAUTHORIZED=0 \
BASE_URL="https://localhost:${HTTPS_PORT}" \
MAILPIT_URL="http://127.0.0.1:8126" \
BACKEND_EXEC="${DC[*]} exec -T backend" \
ARTIFACTS_DIR="$HERE/artifacts" \
  node ui.mjs
