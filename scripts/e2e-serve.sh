#!/usr/bin/env bash
# Sobe API (SQLite), Vite e Astro para o Playwright. Fica em primeiro plano até o sinal de saída.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v php >/dev/null 2>&1; then
  echo "e2e: PHP 8.4 com pdo_sqlite precisa estar no PATH. O GitHub Actions instala esse PHP no runner." >&2
  exit 1
fi
# shellcheck disable=SC1091
source "$ROOT/e2e/ports.env"

DB_FILE="$ROOT/backend/database/e2e.sqlite"
PIDS=()

export APP_ENV=e2e
export APP_KEY="${APP_KEY:-base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=}"
export APP_DEBUG=true
export APP_URL="http://127.0.0.1:${API_PORT}"
export DB_CONNECTION=sqlite
export DB_DATABASE="$DB_FILE"
export DB_URL=
export DB_HOST=
export DB_PORT=
export DB_USERNAME=
export DB_PASSWORD=
export CACHE_STORE=array
export SESSION_DRIVER=array
export QUEUE_CONNECTION=database
export MAIL_MAILER=array
export MAIL_CC=
export BROADCAST_CONNECTION=null
export LOG_CHANNEL=stderr
export FILESYSTEM_DISK=local
export BCRYPT_ROUNDS=4
export ZAPSIGN_TOKEN=
export WHATSAPP_ACCESS_TOKEN=
export CORS_ALLOWED_ORIGINS="http://construtora.localhost:${VITE_PORT},http://corretor.localhost:${VITE_PORT},http://admin.localhost:${VITE_PORT},http://www.localhost:${ASTRO_PORT}"
export SANCTUM_STATEFUL_DOMAINS="construtora.localhost,corretor.localhost,admin.localhost,www.localhost,api.localhost"

cleanup() {
  local pid
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup EXIT INT TERM

wait_port() {
  local port="$1"
  local label="$2"
  local attempt

  for attempt in $(seq 1 90); do
    if (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "e2e: ${label} não abriu na porta ${port}" >&2
  return 1
}

ensure_deps() {
  local dir="$1"
  if [[ ! -d "$dir/node_modules" ]]; then
    (cd "$dir" && pnpm install --frozen-lockfile)
  fi
}

if [[ "${CI:-}" == "true" ]] && ! getent hosts api.localhost >/dev/null 2>&1; then
  printf '127.0.0.1 api.localhost corretor.localhost construtora.localhost www.localhost admin.localhost\n' | sudo tee -a /etc/hosts >/dev/null
fi

rm -f "$DB_FILE" "$DB_FILE-journal" "$DB_FILE-wal" "$DB_FILE-shm"

(
  cd "$ROOT/backend"
  php artisan config:clear --no-interaction
  php artisan migrate --force --no-interaction
  php artisan db:seed --class=Database\\Seeders\\E2eSeeder --force --no-interaction
)

ensure_deps "$ROOT/frontend"
ensure_deps "$ROOT/sites"

(
  cd "$ROOT/frontend"
  VITE_API_URL="http://api.localhost:${API_PORT}/api" pnpm exec vite --host 127.0.0.1 --port "$VITE_PORT" --strictPort
) &
PIDS+=("$!")

(
  cd "$ROOT/sites"
  PUBLIC_API_BASE_URL="http://127.0.0.1:${API_PORT}/api" \
    PUBLIC_SITE_URL="http://www.localhost:${ASTRO_PORT}" \
    ASTRO_ADAPTER=node \
    pnpm exec astro dev --host 127.0.0.1 --port "$ASTRO_PORT"
) &
PIDS+=("$!")

wait_port "$VITE_PORT" "Vite"
wait_port "$ASTRO_PORT" "Astro"

(
  cd "$ROOT/backend"
  php artisan serve --host=127.0.0.1 --port="$API_PORT" --no-reload
) &
PIDS+=("$!")

for attempt in $(seq 1 60); do
  if curl --fail --silent "http://127.0.0.1:${API_PORT}/up" >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 60 ]]; then
    echo "e2e: API não respondeu em /up" >&2
    exit 1
  fi
  sleep 1
done

wait
