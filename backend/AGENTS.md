# Oportalimobiliário — Guia para agentes de IA

Monorepo Laravel API + React SPA multi-perfil. **Leia este arquivo primeiro** antes de implementar qualquer coisa.

Documentação válida **somente neste repositório** — projetos com stack parecida são independentes.

## Leitura obrigatória por contexto

| Situação | Arquivos |
|----------|----------|
| Índice de documentação | [`.specs/codebase/AI_CONTEXT.md`](.specs/codebase/AI_CONTEXT.md) |
| Qualquer task | [`.specs/project/STATE.md`](.specs/project/STATE.md) |
| Convenções do projeto | [`.cursor/skills/opim-conventions/SKILL.md`](.cursor/skills/opim-conventions/SKILL.md) |
| Onde está cada REQ | [`.specs/codebase/TRACEABILITY.md`](.specs/codebase/TRACEABILITY.md) |
| Dados de dev / login | [`.specs/codebase/SEEDS.md`](.specs/codebase/SEEDS.md) · [`docs/DEV_ACCESS.md`](docs/DEV_ACCESS.md) |
| Fluxos de negócio | [`.specs/codebase/FLOWS.md`](.specs/codebase/FLOWS.md) |
| Frontend (rotas, portais) | [`.specs/codebase/FRONTEND.md`](.specs/codebase/FRONTEND.md) |
| Permissões builder | [`.specs/codebase/PERMISSIONS.md`](.specs/codebase/PERMISSIONS.md) |
| PT ↔ EN (glossário) | [`.specs/codebase/GLOSSARY.md`](.specs/codebase/GLOSSARY.md) |
| Erros comuns | [`.specs/codebase/ANTI-PATTERNS.md`](.specs/codebase/ANTI-PATTERNS.md) |
| Backend Laravel | [`backend/AGENTS.md`](backend/AGENTS.md) (Laravel Boost) |

## Feature em andamento

1. Carregar **apenas** `.specs/features/<feature>/spec.md` (+ `design.md` / `tasks.md` se existirem).
2. Specs podem ter frontmatter YAML (`branch`, `status`, `depends_on`) — ver `AI_CONTEXT.md`.
3. Consultar `TRACEABILITY.md` para arquivos já implementados.
4. Ao concluir: atualizar traceability se criou arquivos novos; apenas o orquestrador atualiza `STATE.md`.

## Comandos (sempre via Docker)

```bash
docker compose exec backend php artisan test --compact
docker compose exec frontend pnpm test
```

**Proibido no host:** `php artisan`, `composer`, `pnpm`, `npm`.  
**Proibido sem pedido explícito:** `migrate:fresh`, `db:wipe`.

## Stack resumida

| Camada | Tecnologia |
|--------|------------|
| Backend | Laravel 13 API-only, Sanctum, Spatie Permission (teams), Pest |
| Frontend | React 19, Vite, TypeScript, shadcn/ui, Vitest |
| DB | PostgreSQL 16 (dev); SQLite in-memory (testes) |
| Tenancy | Single DB + `tenant_id`; **sem** stancl/tenancy |

## Perfis e API

| Portal (dev) | Role | Prefixo API |
|--------------|------|-------------|
| `construtora.localhost:5173` | `builder` | `/api/builder/*` |
| `corretor.localhost:5173` | `broker` | `/api/broker/*` |
| `admin.localhost:5173` | `admin` | `/api/admin/*` |
| `www.localhost:5173` | — | `/api/public/*` |
| `api.localhost:8000` | — | `/api/*` |

## Skills a ativar

| Domínio | Skill |
|---------|-------|
| Backend Laravel | `laravel-best-practices`, `pest-testing` |
| Convenções OPIM | `opim-conventions` |
| Planejamento / specs | `tlc-spec-driven` |
| React / performance | `vercel-react-best-practices`, `vercel-composition-patterns` |

## MCP

Laravel Boost (`boost:mcp` via Docker) — preferir `database-schema`, `search-docs`, `database-query` antes de adivinhar schema ou docs.

## Qualidade (gate)

1. Feature test Pest por endpoint alterado
2. Atualizar `docs/api/openapi.yaml` se mudou contrato
3. Vitest para componentes com interação
4. Rodar testes afetados antes de concluir

## Estrutura de specs

```
.specs/
├── project/     # PROJECT.md, ROADMAP.md, STATE.md
├── features/    # spec.md (+ design.md, tasks.md)
└── codebase/    # arquitetura, traceability, seeds, flows…
```
