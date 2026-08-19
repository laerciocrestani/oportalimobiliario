---
feature: user-activity-log
status: in_progress
---

# Tasks — user-activity-log

Ordem: backend (schema → logger → auth → APIs → instrumentação) antes do frontend. 1 commit atômico por task.

## Backend — fundação

- [x] **T-01** Migration `user_activity_events` + enum `UserActivityAction` + model append-only (bloqueia update/delete) + factory + `UserActivityLogger` (INSERT + duplicação de impersonate) + permission `audit.view`.
  - Req: `REQ-LOG-001`, `REQ-LOG-002`, `REQ-LOG-005`, `REQ-LOG-009`
  - Gate: `docker compose exec backend php artisan test --compact --filter=UserActivity`
  - Tests: unit

- [x] **T-02** Instrumentar `AuthController`: login ok, login falho, logout. Login falho com usuário existente entra no log dele; identificador desconhecido fica com `actor_user_id` nulo.
  - Req: `REQ-LOG-004`
  - Gate: `php artisan test --compact --filter=LoginTest`
  - Tests: feature (estender `LoginTest`)
  - Depends on: T-01

- [x] **T-03** Instrumentar impersonate start (`exchangeImpersonation`) e stop (logout de token `impersonate:*`) nos dois logs.
  - Req: `REQ-LOG-005`
  - Gate: `php artisan test --compact --filter=TenantImpersonation`
  - Tests: feature
  - Depends on: T-01, T-02

## Backend — leitura

- [x] **T-04** `UserActivityQuery` + `GET /api/builder/activity` (próprio; `user_id` exige `audit.view` + mesmo tenant builder) + `GET /api/builder/activity/members`. 401/403/422 + isolamento.
  - Req: `REQ-LOG-007`, `REQ-LOG-009`, `REQ-LOG-010`
  - Gate: `php artisan test --compact --filter=BuilderActivity`
  - Tests: feature
  - Depends on: T-01

- [x] **T-05** `GET /api/broker/activity` (só próprio; filtro `tenant_id` opcional). 403 se `user_id` alheio.
  - Req: `REQ-LOG-006`, `REQ-LOG-010`
  - Gate: `php artisan test --compact --filter=BrokerActivity`
  - Tests: feature
  - Depends on: T-01

- [x] **T-06** `GET /api/admin/activity` + `GET /api/admin/activity/export` (CSV streamed, mesmos filtros, `from`/`to` required, sem teto de intervalo).
  - Req: `REQ-LOG-008`
  - Gate: `php artisan test --compact --filter=AdminActivity`
  - Tests: feature
  - Depends on: T-01

## Backend — instrumentação do catálogo v1

- [x] **T-07** Corretor: CRUD cliente; criar/cancelar/confirmar pré-reserva e reserva; proposta, comprovante, dados de contrato, mensagens. Mesmo ponto da timeline quando houver.
  - Req: `REQ-LOG-003`
  - Gate: testes de reserva/cliente existentes + asserts de `user_activity_events` nos fluxos cobertos
  - Tests: feature
  - Depends on: T-01

- [x] **T-08** Construtora: CRUD empreendimento/torre/unidade; status de unidade; convites e acesso de corretores; decisões de reserva (proposta/sinal/contrato/cancelar); CRUD equipe.
  - Req: `REQ-LOG-003`
  - Gate: testes builder existentes + asserts de log
  - Tests: feature
  - Depends on: T-01

- [x] **T-09** Admin: CRUD tenants; mutação durante impersonate duplica (cobertura além de T-03).
  - Req: `REQ-LOG-003`, `REQ-LOG-005`
  - Gate: `php artisan test --compact --filter=TenantTest` / impersonation
  - Tests: feature
  - Depends on: T-03

- [x] **T-10** Command `opim:purge-user-activity` (5 anos) + schedule diário. Teste: evento antigo some, recente permanece.
  - Req: `REQ-LOG-012`
  - Gate: `php artisan test --compact --filter=PurgeUserActivity`
  - Tests: feature
  - Depends on: T-01

- [x] **T-11** OpenAPI dos endpoints novos.
  - Req: `REQ-LOG-013`
  - Depends on: T-04, T-05, T-06

## Frontend

- [x] **T-12** `audit.view` no catálogo FE + item **Atividade** na nav dos três portais; builder mostra item para todos (próprio log).
  - Req: `REQ-LOG-009`, `REQ-LOG-013`
  - Gate: `pnpm test` `dashboard-nav` / `BuilderDashboardShell`
  - Tests: unit FE
  - Depends on: T-01

- [ ] **T-13** `ActivityPage` construtora (date range; seletor de membro se `audit.view`) + cliente API + Vitest.
  - Req: `REQ-LOG-007`, `REQ-LOG-013`
  - Gate: `pnpm test` `ActivityPage`
  - Tests: component
  - Depends on: T-04, T-12

- [ ] **T-14** `ActivityPage` corretor (date range + tenant opcional) + Vitest.
  - Req: `REQ-LOG-006`
  - Depends on: T-05, T-12

- [ ] **T-15** `ActivityPage` admin (filtros + export CSV) + Vitest.
  - Req: `REQ-LOG-008`
  - Depends on: T-06, T-12

## Encerramento

- [ ] **T-16** TRACEABILITY, FRONTEND, PERMISSIONS, SEEDS, GLOSSARY, STATE. `construtora@alpha.demo` recebe `audit.view` via `all()`. Documentar que `comercial`/`supervisor` não têm a permissão.
  - Req: `REQ-LOG-013`
  - Depends on: T-11 … T-15

## Execution Plan

```
T-01
  ├─ T-02 → T-03 → T-09
  ├─ T-04 [P com T-05/T-06]
  ├─ T-05 [P]
  ├─ T-06 [P]
  ├─ T-07 [P com T-08 após T-01]
  ├─ T-08 [P]
  └─ T-10 [P]
T-04+T-05+T-06 → T-11
T-01 → T-12 → T-13 / T-14 / T-15
T-11 + T-13 + T-14 + T-15 → T-16
```

T-02/T-03 são sequenciais (mesmo `AuthController`). T-07/T-08/T-09 tocam controllers diferentes — paralelizáveis após T-01, mas T-09 depende da detecção de impersonate (T-03).
