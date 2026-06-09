# Tasks: infra-docker

## Spec

- [x] [ORCH] Criar spec.md com REQ-INFRA-*

## Execute

- [ ] [BE] Criar `docker/php/Dockerfile` (PHP 8.3 + pgsql + composer)
- [ ] [INFRA] Criar `docker-compose.yml` (postgres, backend, frontend)
- [ ] [BE] Bootstrap Laravel API-only em `backend/`
- [ ] [BE] Configurar Pest em `backend/`
- [ ] [FE] Bootstrap React + Vite + pnpm em `frontend/`
- [ ] [INFRA] Criar `.env.example` na raiz
- [ ] [INFRA] Criar `README.md` com quick start
- [ ] [QA] Validar `docker compose up -d` e health dos serviços

## Gate

```bash
docker compose up -d
docker compose exec backend php artisan --version
docker compose exec frontend pnpm --version
docker compose exec backend php artisan test
```
