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

| Perfil | Contexto tenant |
|--------|-----------------|
| Construtora | Sim (user.tenant_id) |
| Corretor | Não (acessos explícitos) |
| Admin | Não (cross-tenant por policy) |
| Público | Filtro publicado |
