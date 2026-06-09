# STATE — Oportalimobiliário

> Memória persistente entre sessões. Apenas o orquestrador atualiza este arquivo.

## Decisões arquiteturais

| Decisão | Valor |
|---------|-------|
| Multitenancy | Single DB + `tenant_id`, **sem** stancl/tenancy |
| Implementação tenancy | Middleware + `TenantContext` + trait `BelongsToTenant` |
| Corretor | 1 conta, N tenants via `acessos_unidades` |
| Auth | E-mail + senha, Laravel Sanctum |
| Reservas | Soft/temporárias com TTL configurável (default 48h) |
| Estrutura repo | `frontend/` + `backend/` + `docker-compose.yml` na raiz |
| Portal público | Módulo dentro de `frontend/`, não pasta separada |
| Permissões | spatie/laravel-permission com teams (`tenant_id`) |
| Qualidade API | 100% endpoints com Pest + OpenAPI atualizado |
| Seeds | Toda feature de API entrega Seeder correspondente |
| Testes frontend | Vitest + React Testing Library |
| Testes backend | Pest — Feature + Unit |
| Popular banco local | `docker compose exec backend php artisan migrate:fresh --seed` |
| Execução de comandos | Sempre via `docker compose exec <serviço>` |
| Multi-agents | 1 agent por frente/feature |
| Design system | shadcn/ui preset `b3kI323Ky` + template Vite |
| Git remote | `git@github.com:laerciocrestani/oportalimobiliario.git` |
| Git branch | `main` |
| Git workflow | Commit atômico por feature/etapa + push após cada etapa |

## Sessão atual

- **Fase:** 0 — Fundação
- **Última etapa concluída:** install-skill
- **Próxima etapa:** init-specs-project (este commit)

## Blockers

Nenhum.

## Lições aprendidas

_(vazio — preencher durante execução)_

## Ideias adiadas

_(vazio)_
