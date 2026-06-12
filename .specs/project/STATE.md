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
| Estrutura repo | `frontend/` + `backend/` + `docker-compose.yml` na raiz |
| Portal público | Módulo dentro de `frontend/`, não pasta separada |
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
| Portais por subdomínio | `construtora` / `corretor` / `admin` / `www` + API em `api.localhost` |
| Sessão multi-portal | Bearer + `localStorage` isolado por subdomínio (sem cookie compartilhado) |

## Sessão atual

- **Fase:** broker-dashboard concluída
- **Última etapa concluída:** dashboard corretor (nav, clientes, empreendimentos, reserva com client_id) — 78 BE + 7 FE broker tests
- **Próxima etapa:** smoke manual em `corretor.localhost` + integração charts com API real (futuro)

## Blockers

Nenhum.

## Lições aprendidas

- Route model binding executa antes dos middlewares de rota por padrão; tenancy exige `middleware->priority()` com `SetTenantFromUser` antes de `SubstituteBindings`.

## Ideias adiadas

- Deploy `diadimoveis.com.br` (REQ-PUB-005 / REQ-SUB-012)
- Tenant por subdomínio (`alpha.construtora.localhost`)
- Cookie auth compartilhada entre portais (`domain=.localhost`)
- Middleware backend `Host` vs `role` (hardening)
