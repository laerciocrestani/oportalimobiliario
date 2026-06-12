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

| Portal | URL |
|--------|-----|
| Construtora | http://construtora.localhost:5173 |
| Corretor | http://corretor.localhost:5173 |
| Admin SaaS | http://admin.localhost:5173 |
| Público | http://www.localhost:5173 |
| API | http://api.localhost:8000 |
| API health | http://api.localhost:8000/api/health |

Chrome resolve `*.localhost` automaticamente. Em outros browsers, adicione ao `/etc/hosts`:

```
127.0.0.1 construtora.localhost corretor.localhost admin.localhost www.localhost api.localhost
```

Acessar `http://localhost:5173` exibe orientação com links para cada portal.

## Comandos (sempre via Docker)

```bash
# Backend
docker compose exec backend php artisan test
docker compose exec backend php artisan migrate
docker compose exec backend php artisan db:seed
docker compose exec backend composer install

# Frontend
docker compose exec frontend pnpm install
docker compose exec frontend pnpm dev
docker compose exec frontend pnpm test
docker compose exec frontend pnpm build
```

## API (prefixos em inglês)

Rotas e identificadores de código usam vocabulário EN; labels de UI e subdomínios de dev permanecem em português.

| Perfil (portal) | Role | Prefixo API |
|-----------------|------|-------------|
| Construtora | `builder` | `/api/builder/*` |
| Corretor | `broker` | `/api/broker/*` |
| Admin SaaS | `admin` | `/api/admin/*` |
| Público | — | `/api/public/buildings` |

Contrato completo: [`docs/api/openapi.yaml`](docs/api/openapi.yaml). Mapeamento PT↔EN: [`.specs/codebase/GLOSSARY.md`](.specs/codebase/GLOSSARY.md).

## Governança

Especificações em [`.specs/`](.specs/). Decisões em [`.specs/project/STATE.md`](.specs/project/STATE.md).
