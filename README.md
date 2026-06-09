# Oportalimobiliário

SaaS B2B2C multi-tenant para o mercado imobiliário de lançamentos.

## Stack

- **Backend:** Laravel API + PostgreSQL + Pest
- **Frontend:** React + Vite + pnpm + shadcn/ui
- **Infra:** Docker Compose

## Quick start

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend php artisan migrate
```

### URLs

- API: http://localhost:8000
- API health: http://localhost:8000/api/health
- Frontend: http://localhost:5173

## Comandos (sempre via Docker)

```bash
# Backend
docker compose exec backend php artisan test
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec backend composer install

# Frontend
docker compose exec frontend pnpm install
docker compose exec frontend pnpm dev
docker compose exec frontend pnpm test
docker compose exec frontend pnpm build
```

## Governança

Especificações em [`.specs/`](.specs/). Decisões em [`.specs/project/STATE.md`](.specs/project/STATE.md).
