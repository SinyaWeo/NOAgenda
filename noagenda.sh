#!/bin/bash

# Usage: ./start-all.sh [db|backend|frontend|all]
# Default is 'all' if no argument is provided.

set -e

# Set working directories
DOCKER_DIR="$(dirname "$0")/docker"
APP_BACKEND_DIR="$(dirname "$0")/app/backend"
APP_FRONTEND_DIR="$(dirname "$0")/app/frontend"

# Helper to start DB container
start_db() {
  echo "Starting database container..."
  (./start-db.sh)
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

# Helper to stop backend
stop_backend() {
  echo "Stopping backend..."
  pkill -f "node dist/main.js" || true
}

# Helper to stop frontend
stop_frontend() {
  echo "Stopping frontend..."
  pkill -f "svelte-kit dev" || true
}

# Helper to stop DB container
stop_db() {
  echo "Stopping database container..."
  (./stop-db.sh)
}

# Helper to run tests
run_tests() {
  echo "Running backend tests..."
  (cd "$APP_BACKEND_DIR" && npm install && npm run test)
}

# Main logic
case "${1:-all}" in
  db)
    start_db
    ;;
  be)
    start_backend
    ;;
  fe)
    start_frontend
    ;;
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
    echo "Usage: $0 [db|be|fe|start|stop|test]"
    exit 1
    ;;
esac

echo "Done."
