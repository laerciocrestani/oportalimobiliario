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

## Rotas API (planejado)

- `/api/construtora/*` — tenant scoped via SetTenantFromUser
- `/api/corretor/*` — cross-tenant via acessos_unidades
- `/api/admin/*` — role admin SaaS
- `/api/public/*` — read-only, publicado=true

## Tenancy

Single database + `tenant_id`. `TenantContext` por request. Trait `BelongsToTenant` aplica global scope quando contexto ativo.

## Perfis

| Perfil | Contexto tenant | Portal (dev) |
|--------|-----------------|--------------|
| Construtora | Sim (user.tenant_id) | `construtora.localhost:5173` |
| Corretor | Não (acessos explícitos) | `corretor.localhost:5173` |
| Admin | Não (cross-tenant por policy) | `admin.localhost:5173` |
| Público | Filtro publicado | `www.localhost:5173` |

## API host

- Dev: `api.localhost:8000/api`
- Prefixos por perfil inalterados (`/construtora/*`, `/corretor/*`, `/admin/*`, `/public/*`)

## Portais por subdomínio

Feature `subdomain-portals`: escopo de acesso por host, não por path. Sessão Bearer isolada por subdomínio (`localStorage` origin-scoped). Ver `.specs/features/subdomain-portals/`.
