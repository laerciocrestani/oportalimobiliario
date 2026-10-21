#!/usr/bin/env bash
# Abre o Cloudflare Tunnel opim-dev para a ZapSign chamar o webhook local.
# Roda no host (não no Docker): o destino é a porta 8000 publicada pelo backend.
set -euo pipefail

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared não está instalado. Rode: brew install cloudflared" >&2
  exit 1
fi

if [[ ! -f "${HOME}/.cloudflared/config.yml" ]]; then
  echo "Falta ~/.cloudflared/config.yml com o túnel opim-dev." >&2
  exit 1
fi

echo "Webhook: https://hooks-dev.oportalimobiliario.com.br/api/webhooks/zapsign"
echo "Destino: http://127.0.0.1:8000"
echo "Pare com Ctrl+C."

exec cloudflared tunnel run opim-dev
