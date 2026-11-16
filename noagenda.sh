#!/bin/bash

# Usage: ./noagenda.sh start|stop|test

set -e

# Absolute paths, so the stop commands below match only THIS project's processes
ROOT="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$ROOT/docker"
APP_BACKEND_DIR="$ROOT/app/backend"
APP_FRONTEND_DIR="$ROOT/app/frontend"

# Helper to start DB container
start_db() {
  echo "Starting database container..."
  (docker compose -f "$DOCKER_DIR/docker-compose.yml" up -d)
}

# Helper to start backend
start_backend() {
  echo "Starting backend (NestJS)..."
  (cd "$APP_BACKEND_DIR" && npm install && npm run start:dev &)
}

# Helper to start frontend
start_frontend() {
  echo "Starting frontend (SvelteKit)..."
  (cd "$APP_FRONTEND_DIR" && npm install && npm run dev &)
}

# Helper to stop backend: start_backend runs `nest start --watch`, which spawns `node dist/main`
stop_backend() {
  echo "Stopping backend..."
  pkill -f "$APP_BACKEND_DIR/node_modules/.bin/nest start" || true
  pkill -f "$APP_BACKEND_DIR/dist/main" || true
}

# Helper to stop frontend: start_frontend runs `vite dev`
stop_frontend() {
  echo "Stopping frontend..."
  pkill -f "$APP_FRONTEND_DIR/node_modules/.bin/vite" || true
}

# Helper to stop DB container
stop_db() {
  echo "Stopping database container..."
  (docker compose -f "$DOCKER_DIR/docker-compose.yml" down)
}

# Helper to run tests
run_tests() {
  echo "Running backend tests..."
  (cd "$APP_BACKEND_DIR" && npm install && npm run test)
  echo "Checking frontend (svelte-check)..."
  (cd "$APP_FRONTEND_DIR" && npm install && npm run check)
}

# Main logic
case "${1:-}" in
  start)
    start_db
    start_backend
    start_frontend
    ;;
  stop)
    stop_frontend
    stop_backend
    stop_db
    ;;
  test)
    run_tests
    ;;
  *)
    echo "Usage: $0 start|stop|test"
    exit 1
    ;;
esac

echo "Done."
