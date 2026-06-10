# Architecture

## Visão geral

Monorepo com API Laravel e SPA React, orquestrados via Docker Compose.

```
oportalimobiliario/
├── backend/          # Laravel API-only
├── frontend/         # React SPA
├── docker/           # Dockerfiles
└── .specs/           # Governança spec-driven
```

## Rotas API

- `/api/builder/*` — tenant scoped via `SetTenantFromUser` (role `builder`)
- `/api/broker/*` — cross-tenant via `unit_access` (role `broker`)
- `/api/admin/*` — role admin SaaS
- `/api/public/*` — read-only, `published=true`

## Tenancy

Single database + `tenant_id`. `TenantContext` por request. Trait `BelongsToTenant` aplica global scope quando contexto ativo.

## Perfis

| Perfil (UI) | Role (code) | Contexto tenant | Portal (dev) |
|-------------|-------------|-----------------|--------------|
| Construtora | `builder` | Sim (`user.tenant_id`) | `construtora.localhost:5173` |
| Corretor | `broker` | Não (`unit_access` explícitos) | `corretor.localhost:5173` |
| Admin | `admin` | Não (cross-tenant por policy) | `admin.localhost:5173` |
| Público | — | Filtro `published` | `www.localhost:5173` |

## API host

- Dev: `api.localhost:8000/api`
- Prefixos por perfil: `/builder/*`, `/broker/*`, `/admin/*`, `/public/*`

## Portais por subdomínio

Feature `subdomain-portals`: escopo de acesso por host, não por path. Sessão Bearer isolada por subdomínio (`localStorage` origin-scoped). Ver `.specs/features/subdomain-portals/`.
