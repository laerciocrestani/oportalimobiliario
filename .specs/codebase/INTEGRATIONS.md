# Integrations

## API

- Base URL dev: `http://api.localhost:8000/api` (legado: `http://localhost:8000/api`)
- Health: `GET /api/health`
- OpenAPI: `docs/api/openapi.yaml`

## Portais (dev)

| Host | Perfil |
|------|--------|
| `construtora.localhost:5173` | Construtora |
| `corretor.localhost:5173` | Corretor |
| `admin.localhost:5173` | Admin SaaS |
| `www.localhost:5173` | Público |

## Frontend → API

- Variável: `VITE_API_URL` (default `http://api.localhost:8000/api`)
- Cliente: `frontend/src/lib/api.ts` (`builderApi`, `brokerApi`, `adminApi`, `publicApi`)
- Prefixos API: `/api/builder/*`, `/api/broker/*`, `/api/admin/*`, `/api/public/buildings`
- CORS: origens dos 4 hosts FE em `CORS_ALLOWED_ORIGINS`

## Database

- Host docker: `postgres`
- Credenciais: ver `.env.example`

## GitHub

- Remote: `git@github.com:laerciocrestani/oportalimobiliario.git`
