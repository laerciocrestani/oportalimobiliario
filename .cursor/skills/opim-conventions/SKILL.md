---
name: opim-conventions
description: Convenções do monorepo Oportalimobiliário (Laravel API + React SPA multi-perfil). Use ao implementar features de backend, frontend, tenancy, auth, buildings, reservations ou ao criar rotas/controllers/components neste projeto.
---

# Oportalimobiliário — Convenções do Projeto

## Stack e comandos

- Monorepo: `backend/` (Laravel 13 API-only) + `frontend/` (React 19 + Vite + TypeScript + shadcn/ui)
- **Sempre** executar comandos via Docker:
  - Backend: `docker compose exec backend ...`
  - Frontend: `docker compose exec frontend ...`
- Gate de testes backend: `docker compose exec backend php artisan test` (SQLite em memória — não apaga Postgres de dev)
- **Proibido** `migrate:fresh` / `db:wipe` sem pedido explícito do usuário

## Perfis e rotas API

| Perfil (UI) | Role (code) | Prefixo API | Tenant context | Middleware principal |
|-------------|-------------|-------------|----------------|----------------------|
| Construtora | `builder` | `/api/builder/*` | Sim (`tenant.from.user` + `tenant.ensure`) | `builder` |
| Corretor | `broker` | `/api/broker/*` | Não (`tenant.ensure.none`) | `broker` |
| Admin SaaS | `admin` | `/api/admin/*` | Não | `admin` |
| Público | — | `/api/public/*` | Não (filtro `published=true`) | sem auth |

Controllers em `backend/app/Http/Controllers/Api/{Builder|Broker|Admin|Public}/`. Não misturar lógica de perfis.

Subdomínios de dev permanecem em PT (`construtora.localhost`, `corretor.localhost`); chaves internas de perfil usam EN (`builder`, `broker`). Ver `.specs/codebase/GLOSSARY.md`.

## Domínio (models / tabelas)

| Conceito (UI pt-BR) | Model / tabela (EN) |
|---------------------|---------------------|
| Empreendimento | `Building` / `buildings` |
| Unidade | `Unit` / `units` |
| Reserva | `Reservation` / `reservations` |
| Convite corretor | `BrokerInvite` / `broker_invites` |
| Acesso unidade | `UnitAccess` / `unit_access` |

## Tenancy

- Single database + `tenant_id`; **não** usar stancl/tenancy
- Models de domínio do builder usam trait `BelongsToTenant`
- Broker acessa unidades via `unit_access`, não via tenant scope global
- Admin é cross-tenant por policy, sem `TenantContext`

## Qualidade de API (obrigatório)

1. Toda rota nova/alterada exige **Feature test** (Pest)
2. Toda model com seeder exige **Factory**
3. Policy/Middleware exige teste dedicado
4. Cobrir: happy path, 401/403, 422, **tenant isolation**
5. Atualizar `docs/api/openapi.yaml` em mudanças de endpoint

## Frontend

- Apps por perfil em `frontend/src/apps/{builder,broker,admin,publico}/` (pastas FE podem manter nome PT legado; profile keys são EN)
- Cliente HTTP centralizado em `frontend/src/lib/api.ts` — tipos e funções por perfil (`builderApi`, `brokerApi`, `adminApi`, `publicApi`)
- Auth via Sanctum: token em `localStorage` (`opim_token`), header `Authorization: Bearer`
- `VITE_API_URL` aponta para `http://api.localhost:8000/api`
- Componentes UI: shadcn em `frontend/src/components/ui/`
- Testes: Vitest + React Testing Library em `*.test.tsx`

## Padrões de implementação

- Backend: Form Requests para validação, enums para status (`UnitStatus`, etc.), Services para lógica transacional (ex.: expiração de reservations)
- Não adicionar dependências sem necessidade
- Não refatorar código adjacente não relacionado à task
- Seguir estrutura existente em `backend/routes/api.php` e `backend/bootstrap/app.php`

## Specs e governança

- Entry point IA: `AGENTS.md` + `.specs/codebase/AI_CONTEXT.md`
- Specs em `.specs/`; estado em `.specs/project/STATE.md`
- Índices: `TRACEABILITY`, `SEEDS`, `FLOWS`, `FRONTEND`, `PERMISSIONS`, `ANTI-PATTERNS`
- Checklist dev: `docs/DEV_ACCESS.md`
- Specs com frontmatter YAML (`branch`, `status`, `depends_on`) — ver `AI_CONTEXT.md`
- Multi-agent: 1 agent = 1 feature; backend antes do frontend

## Skills relacionadas

Ativar conforme o domínio:

- `pest-testing` / `laravel-best-practices` — backend Laravel
- `vercel-react-best-practices` / `vercel-composition-patterns` — performance e composição React
- `shadcn` — componentes UI
- `tlc-spec-driven` — planejamento e implementação spec-driven
