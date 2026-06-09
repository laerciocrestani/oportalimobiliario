# Feature: tenancy

## Requisitos

- `REQ-TEN-001`: `TenantContext` scoped por request com set/id/forget
- `REQ-TEN-002`: Trait `BelongsToTenant` aplica global scope quando tenant ativo
- `REQ-TEN-003`: Middleware `SetTenantFromUser` define tenant a partir de `user.tenant_id`
- `REQ-TEN-004`: Rotas corretor **não** usam global scope (`EnsureNoTenantContext`)
- `REQ-TEN-005`: Testes de isolamento entre tenants obrigatórios
- `REQ-TEN-006`: Jobs recebem `tenant_id` explicitamente no payload (`TenantAwareJob` concern)

## Critérios de aceite

- [ ] TenantContext set/forget funciona por request
- [ ] BelongsToTenant filtra queries quando contexto ativo
- [ ] SetTenantFromUser popula contexto do usuário autenticado
- [ ] EnsureTenantContext retorna 403 sem contexto
- [ ] Testes de isolamento passam
- [ ] TenantSeeder popula 2+ tenants demo
