# Oportalimobiliário

**Vision:** SaaS B2B2C multi-tenant para o mercado imobiliário de lançamentos, conectando construtoras, corretores e consumidores finais.
**For:** Construtoras, corretores, administradores SaaS e usuários finais do portal público.
**Solves:** Gestão centralizada de empreendimentos, unidades, reservas e acesso cross-tenant para corretores em um único ecossistema.

## Goals

- MVP funcional com perfis Construtora, Corretor, Admin e Portal público
- Isolamento de dados entre tenants com tenancy customizado (single DB + tenant_id)
- 100% dos endpoints API cobertos por testes Pest + OpenAPI atualizado

## Tech Stack

**Core:**

- Frontend: React + TypeScript + Vite + pnpm + shadcn/ui (preset `b3kI323Ky`)
- Backend: Laravel 11+ API-only
- Database: PostgreSQL 16
- Infra: Docker Compose

**Key dependencies:**

- Laravel Sanctum (auth)
- spatie/laravel-permission com teams (tenant_id)
- Pest (testes backend)
- Vitest + React Testing Library (testes frontend)

## Scope

**v1 includes:**

- Infra Docker + bootstrap apps
- Tenancy customizado (TenantContext, middlewares, BelongsToTenant)
- Auth e-mail/senha com Sanctum + roles por perfil
- CRUD buildings e units (`/api/builder/*`)
- Reservations soft com TTL configurável (default 48h; `opim:expire-reservations`)
- Convites e `unit_access` cross-tenant para brokers (`/api/broker/*`)
- Admin de tenants (construtoras)
- Portal público read-only com SEO

**Explicitly out of scope:**

- stancl/tenancy ou multi-database
- Pagamentos e assinaturas SaaS
- App mobile nativo

## Constraints

- Comandos de dev sempre via `docker compose exec backend|frontend`
- Commit atômico + push GitHub após cada etapa/feature
- Remote: `git@github.com:laerciocrestani/oportalimobiliario.git`, branch `main`

## Domínios

- `construtora.oportalimobiliario.com.br`
- `corretor.oportalimobiliario.com.br`
- `admin.oportalimobiliario.com.br`
- `diadimoveis.com.br` (portal público)
