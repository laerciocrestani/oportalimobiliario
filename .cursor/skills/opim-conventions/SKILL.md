---
name: opim-conventions
description: Convenções do monorepo Oportalimobiliário (Laravel API + React SPA multi-perfil). Use ao implementar features de backend, frontend, tenancy, auth, empreendimentos, reservas ou ao criar rotas/controllers/components neste projeto.
---

# Oportalimobiliário — Convenções do Projeto

## Stack e comandos

- Monorepo: `backend/` (Laravel 13 API-only) + `frontend/` (React 19 + Vite + TypeScript + shadcn/ui)
- **Sempre** executar comandos via Docker:
  - Backend: `docker compose exec backend ...`
  - Frontend: `docker compose exec frontend ...`
- Gate de testes backend: `docker compose exec backend php artisan test`

## Perfis e rotas API

| Perfil | Prefixo API | Tenant context | Middleware principal |
|--------|-------------|----------------|----------------------|
| Construtora | `/api/construtora/*` | Sim (`tenant.from.user` + `tenant.ensure`) | `construtora` |
| Corretor | `/api/corretor/*` | Não (`tenant.ensure.none`) | `corretor` |
| Admin SaaS | `/api/admin/*` | Não | `admin` |
| Público | `/api/public/*` | Não (filtro `publicado=true`) | sem auth |

Controllers em `backend/app/Http/Controllers/Api/{Perfil}/`. Não misturar lógica de perfis.

## Tenancy

- Single database + `tenant_id`; **não** usar stancl/tenancy
- Models de domínio da construtora usam trait `BelongsToTenant`
- Corretor acessa unidades via `acessos_unidades`, não via tenant scope global
- Admin é cross-tenant por policy, sem `TenantContext`

## Qualidade de API (obrigatório)

1. Toda rota nova/alterada exige **Feature test** (Pest)
2. Toda model com seeder exige **Factory**
3. Policy/Middleware exige teste dedicado
4. Cobrir: happy path, 401/403, 422, **tenant isolation**
5. Atualizar `docs/api/openapi.yaml` em mudanças de endpoint

## Frontend

- Apps por perfil em `frontend/src/apps/{perfil}/`
- Cliente HTTP centralizado em `frontend/src/lib/api.ts` — tipos e funções por perfil (`construtoraApi`, `corretorApi`, `adminApi`, `publicApi`)
- Auth via Sanctum: token em `localStorage` (`opim_token`), header `Authorization: Bearer`
- `VITE_API_URL` aponta para `http://localhost:8000/api`
- Componentes UI: shadcn em `frontend/src/components/ui/`
- Testes: Vitest + React Testing Library em `*.test.tsx`

## Padrões de implementação

- Backend: Form Requests para validação, enums para status (`UnidadeStatus`, etc.), Services para lógica transacional (ex.: expiração de reservas)
- Não adicionar dependências sem necessidade
- Não refatorar código adjacente não relacionado à task
- Seguir estrutura existente em `backend/routes/api.php` e `backend/bootstrap/app.php`

## Specs e governança

- Specs em `.specs/`; estado do projeto em `.specs/project/STATE.md`
- Multi-agent: 1 agent = 1 feature = 1 frente (BE ou FE); backend antes de frontend que consome API

## Skills relacionadas

Ativar conforme o domínio:

- `pest-testing` / `laravel-best-practices` — backend Laravel
- `vercel-react-best-practices` / `vercel-composition-patterns` — performance e composição React
- `shadcn` — componentes UI
- `tlc-spec-driven` — planejamento e implementação spec-driven
