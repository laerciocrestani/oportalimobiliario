#!/usr/bin/env bash
# Aplica a ruleset da main. Rodar depois que .github/workflows/quality.yml já estiver na main.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${GITHUB_REPOSITORY:-laerciocrestani/oportalimobiliario}"

gh api --method POST "repos/${REPO}/rulesets" --input "$ROOT/.github/rulesets/main-quality.json"
