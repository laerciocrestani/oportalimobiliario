# Anti-patterns — erros comuns neste projeto

Lista de armadilhas que agentes de IA frequentemente cometem aqui.

## Infra e comandos

| ❌ Evitar | ✅ Fazer |
|----------|---------|
| `php artisan` no host | `docker compose exec backend php artisan ...` |
| `pnpm test` no host | `docker compose exec frontend pnpm test` |
| `migrate:fresh` / `db:wipe` sem pedido | `migrate` + `db:seed` |
| Apontar testes ao Postgres de dev | Testes usam SQLite (`backend/.env.testing`) |

## Tenancy

| ❌ Evitar | ✅ Fazer |
|----------|---------|
| Global scope em rotas broker | Broker usa `EnsureNoTenantContext` + filtro manual |
| Assumir `tenant_id` no User broker | Broker tem `tenant_id = null`; acesso via `building_access` |
| Route binding antes do tenant | `SetTenantFromUser` **antes** de `SubstituteBindings` |
| Criar model de domínio builder sem `BelongsToTenant` | Trait em Building, Unit, Reservation, etc. |

## API e perfis

| ❌ Evitar | ✅ Fazer |
|----------|---------|
| Lógica builder em controller broker | Controllers em `Api/{Builder,Broker,Admin,Public}/` |
| Misturar prefixos (`/api/builder` no portal corretor) | `builderApi`, `brokerApi`, etc. em `lib/api.ts` |
| Endpoint novo sem Feature test | Pest + tenant isolation + 401/403/422 |
| Alterar rota sem atualizar OpenAPI | `docs/api/openapi.yaml` |

## Frontend

| ❌ Evitar | ✅ Fazer |
|----------|---------|
| Rotas `/construtora`, `/corretor` como principal | Subdomínios (`construtora.localhost`) |
| `fetch('/api/...')` solto | Funções em `lib/api.ts` |
| Cookie compartilhado entre portais | Bearer em `localStorage` (origin-scoped) |
| Copiar componentes shadcn manualmente | CLI oficial no container frontend |
| Ignorar `ProfileGuard` em página autenticada | Wrap com `<ProfileGuard profile={...}>` |

## Specs e governança

| ❌ Evitar | ✅ Fazer |
|----------|---------|
| Carregar múltiplas specs em sub-agent | 1 agent = 1 feature = 1 spec |
| Atualizar `STATE.md` em sub-agent | Apenas orquestrador |
| Implementar FE antes do BE da mesma feature | Backend primeiro se FE consome API |
| Refatorar código adjacente não relacionado | Diff mínimo focado na task |

## Nomenclatura

| ❌ Evitar | ✅ Fazer |
|----------|---------|
| Identificadores em português no código | EN no code/DB/API (`building`, `unit`) |
| `empreendimento` como nome de model | `Building` |
| Confundir domínio DNS com DDD | Ver GLOSSARY.md para mapeamento PT↔EN |
| Assumir regras de outro repositório | Usar apenas docs e código **deste** projeto |

## Dependências

| ❌ Evitar | ✅ Fazer |
|----------|---------|
| `stancl/tenancy` ou multi-database | Tenancy customizado (single DB) |
| Adicionar pacotes sem necessidade | Reusar Services/Policies existentes |
| `forwardRef` / `useContext` (React 19) | `ref` como prop; `use()` para context |
