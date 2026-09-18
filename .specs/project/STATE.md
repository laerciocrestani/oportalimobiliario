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

- **Fase:** `building-wizard-redesign` em execução
- **Branch:** `feature/building-wizard-redesign` (criada a partir da `main`)
- **WIP preservado:** stash `WIP: feature/kanban-ajustes reservation progress` na branch `feature/kanban-ajustes`
- **Última etapa concluída:** TR-02 — `PUT .../structure` aceita 0/negativo/`garage` e persiste `reference_floor`
- **Próxima etapa:** TR-03 — `PUT .../unit-grid` com vagas, `customized` e códigos `101`/`L01`/`S1-01`
- **Discovery:** `docs/discovery/resumo-redesenho-wizard-empreendimentos.md`
- **Spec:** `.specs/features/building-wizard-redesign/`
- **Nota Entrega 2:** aceite exige `signed_file`; emitir PDF não muda status; CRUD = `proposals.manage`, emitir/aceitar = `reservations.cancel`; aceite com arquivo usa `POST .../proposal/decision` (multipart), recusa/devolução permanece `PATCH` JSON
- **Nota Entrega 3:** testemunhas escolhidas no POST do PDF da construtora (`witness_1_user_id` / `witness_2_user_id`); sold exige 4 assinaturas; badge `pending_action` no card + `pending-actions-count` no menu (inclui reply); testemunha assina sem `reservations.cancel`
- **Nota Entrega 4:** colunas derivadas de `status` + anexos (sem coluna `situation`); drag chama services existentes; 422 `action_required` abre o dialog; testemunha não arrasta; gestor vê todas, corretor só as suas

## Blockers

Nenhum.

## Lições aprendidas

- Route model binding executa antes dos middlewares de rota por padrão; tenancy exige `middleware->priority()` com `SetTenantFromUser` antes de `SubstituteBindings`.

## Ideias adiadas

- Deploy `diadimoveis.com.br` (REQ-PUB-005 / REQ-SUB-012)
- Tenant por subdomínio (`alpha.construtora.localhost`)
- Cookie auth compartilhada entre portais (`domain=.localhost`)
- Middleware backend `Host` vs `role` (hardening)
