# STATE — Oportalimobiliário

> Memória persistente entre sessões. Apenas o orquestrador atualiza este arquivo.

## Decisões arquiteturais

| Decisão | Valor |
|---------|-------|
| Multitenancy | Single DB + `tenant_id`, **sem** stancl/tenancy |
| Implementação tenancy | Middleware + `TenantContext` + trait `BelongsToTenant` |
| Corretor | 1 conta, N tenants via `unit_access` (role `broker`) |
| Auth | E-mail + senha, Laravel Sanctum |
| Reservas | Soft/temporárias com TTL configurável (default 48h); command `opim:expire-reservations` |
| Estrutura repo | `frontend/` + `sites/` + `backend/` + `docker-compose.yml` na raiz |
| Portal público | Pacote `sites/` (Astro SSR :4321), Laravel apenas API |
| Permissões | spatie/laravel-permission com teams (`tenant_id`) |
| Qualidade API | 100% endpoints com Pest + OpenAPI atualizado |
| Seeds | Toda feature de API entrega Seeder correspondente |
| Testes frontend | Vitest + React Testing Library |
| Testes backend | Pest — Feature + Unit |
| Popular banco local | `docker compose exec backend php artisan migrate` + `db:seed` (nunca `migrate:fresh` sem pedido explícito) |
| Execução de comandos | Sempre via `docker compose exec <serviço>` |
| Multi-agents | 1 agent por frente/feature |
| Design system | shadcn/ui preset `b3kI323Ky` + template Vite |
| Git remote | `git@github.com:laerciocrestani/oportalimobiliario.git` |
| Git branch | `main` |
| Git workflow | Commit atômico por feature/etapa + push após cada etapa |
| Route binding tenancy | `SetTenantFromUser` priorizado antes de `SubstituteBindings` |
| Portais por subdomínio | `construtora` / `corretor` / `admin` + `www` (:4321 Astro) + API em `api.localhost` |
| Sessão multi-portal | Bearer + `localStorage` isolado por subdomínio (sem cookie compartilhado) |
| Preço de unidade | Sempre INCC-M; cálculo na leitura a partir de `incc_indices`; job diário 08:05 insert-only |

## Sessão atual

- **Fase:** `user-activity-log` (T-01…T-11 done)
- **Branch:** `feature/user-activity-log`
- **Última etapa concluída:** T-10 — purge de 5 anos (`opim:purge-user-activity`) + schedule diário 03:00
- **Próxima etapa:** T-12 — menu Atividade e `audit.view` no frontend dos três portais
- **Discovery:** `docs/discovery/resumo-log-atividade-usuario.md` (premissas aceitas em `context.md`)
- **Nota:** `units.frozen_price_brl` já existe (contratos); não duplicar a coluna
- **Nota T-07:** assinatura GOV reusa `reservation.contract.uploaded` (catálogo v1 não tem action própria); jobs de expiração não geram log
- **Nota T-08:** wizard de estrutura/planta gera um `building.updated` (não N eventos por unidade); mídia e templates ficam fora do catálogo v1

## Blockers

Nenhum.

## Lições aprendidas

- Route model binding executa antes dos middlewares de rota por padrão; tenancy exige `middleware->priority()` com `SetTenantFromUser` antes de `SubstituteBindings`.

## Ideias adiadas

- Deploy `diadimoveis.com.br` (REQ-PUB-005 / REQ-SUB-012)
- Tenant por subdomínio (`alpha.construtora.localhost`)
- Cookie auth compartilhada entre portais (`domain=.localhost`)
- Middleware backend `Host` vs `role` (hardening)
