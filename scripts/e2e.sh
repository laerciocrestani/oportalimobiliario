#!/usr/bin/env bash
# Jornada de browser no host, com o mesmo boot do GitHub Actions.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/e2e"
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm exec playwright test "$@"
