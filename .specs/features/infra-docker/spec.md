# Feature: infra-docker

## Objetivo

Provisionar ambiente de desenvolvimento local com Docker Compose, bootstrap Laravel API-only no `backend/` e React + Vite + pnpm no `frontend/`.

## Requisitos

- `REQ-INFRA-001`: docker-compose com serviços `frontend` (5173), `backend` (8000), `postgres` (5432)
- `REQ-INFRA-002`: PostgreSQL 16 com healthcheck e volume persistente
- `REQ-INFRA-003`: Backend Laravel 11+ API-only com Pest configurado
- `REQ-INFRA-004`: Frontend React + TypeScript + Vite + pnpm
- `REQ-INFRA-005`: `.env.example` na raiz com variáveis compartilhadas
- `REQ-INFRA-006`: Comandos de dev documentados com prefixo `docker compose exec`
- `REQ-INFRA-007`: README com quick start

## Critérios de aceite

- [ ] `docker compose up -d` sobe os 3 serviços sem erro
- [ ] `docker compose exec backend php artisan --version` responde
- [ ] `docker compose exec frontend pnpm --version` responde
- [ ] Backend acessível em http://localhost:8000
- [ ] Frontend acessível em http://localhost:5173

## Fora de escopo

- shadcn init (feature `frontend-shell`)
- Migrations de domínio
- CI/CD
