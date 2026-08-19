---
branch: feature/user-activity-log
status: in_progress
depends_on: auth, tenancy, builder-team, reservation-timeline, admin-tenants
source: docs/discovery/resumo-log-atividade-usuario.md
---

# Feature: log de atividade de usuário

## Objetivo

Registrar um histórico **append-only da pessoa** (mutações + autenticação + impersonate), consultável pelo próprio ator, pelo gestor da construtora (`audit.view`) e pelo admin SaaS (tela + CSV). Complementa a timeline da reserva; não a substitui.

## Requisitos

- `REQ-LOG-001`: Tabela append-only `user_activity_events` (somente INSERT; sem UPDATE/DELETE na aplicação e na API).
- `REQ-LOG-002`: Cada evento tem `action` (código filtrável), frase humana persistida em PT-BR, ator, `tenant_id` quando couber, recurso, timestamp, e valores antigo/novo quando houver alteração.
- `REQ-LOG-003`: Catálogo v1 de mutações gera evento no log do ator. Transições de reserva que já vão à timeline **também** vão ao log da pessoa.
- `REQ-LOG-004`: Login, logout e login falho geram evento (falha: e-mail/telefone tentado; se o usuário existir, o evento entra no log dele).
- `REQ-LOG-005`: Impersonate start/stop e mutações durante impersonate aparecem **nos dois** logs (admin e impersonado), com indicação de quem operou em nome de quem.
- `REQ-LOG-006`: Corretor consulta o próprio histórico (`GET /api/broker/activity`) com filtro de datas e tenant opcional.
- `REQ-LOG-007`: Builder consulta o próprio histórico (`GET /api/builder/activity`) com filtro de datas. Com `audit.view`, pode escolher um membro da equipe (mesmo tenant, inclusive ex-membros) e ver o log daquela pessoa.
- `REQ-LOG-008`: Admin consulta logs de todos (`GET /api/admin/activity`) com filtros período, tenant, usuário e `action`; exporta CSV sem teto de datas (`GET /api/admin/activity/export`).
- `REQ-LOG-009`: Permissão builder `audit.view` no catálogo Spatie; atribuída no mesmo fluxo de `/team` (`team.manage`). `audit.view` ≠ `team.manage`.
- `REQ-LOG-010`: Isolamento: construtora só vê logs de usuários **builder daquele tenant**. Corretor não vê colegas. Construtora não vê corretor. Admin vê tudo. Consultar o log **não** gera evento.
- `REQ-LOG-011`: PII (documento, telefone, valores) gravado completo na frase e nos snapshots. O ator vê o próprio log completo; PII de terceiros só com `audit.view` ou admin.
- `REQ-LOG-012`: Retenção de 5 anos; command de purge remove eventos mais antigos. Jobs automáticos, leituras, downloads, portal público e anexos binários ficam fora da v1 (anexo: só metadados).
- `REQ-LOG-013`: Telas dedicadas `/activity` nos portais construtora, corretor e admin (item de navegação). Feature tests Pest + OpenAPI + Vitest.

## Fora desta fatia

| Item | Motivo |
|------|--------|
| SIEM, webhook, e-mail de alerta | Fora da v1 |
| Log de visualizações / downloads | Fora da v1 |
| Jobs (`expire-reservations`, INCC, etc.) | Sem ator humano |
| Portal público / www | Sem usuário autenticado deste log |
| Apagar evento a pedido do titular (LGPD) | Trilha de 5 anos vence na v1 |
| Construtora ver log do corretor | Meio comum continua sendo a reserva/timeline |
| Limite de período no CSV | Regra de negócio: sem teto; implementação faz streaming |

## Aceite (WHEN / THEN)

1. WHEN um usuário autentica ou altera um recurso do catálogo v1 THEN o sistema SHALL inserir um evento no log daquele ator com frase em PT-BR.
2. WHEN o login falha THEN o sistema SHALL registrar o identificador tentado; se o usuário existir, o evento SHALL aparecer no log dele.
3. WHEN um admin impersona um builder THEN start, stop e mutações SHALL aparecer nos dois logs.
4. WHEN um builder sem `audit.view` pede o log de outro membro THEN a API SHALL retornar 403.
5. WHEN um builder com `audit.view` filtra outro builder do mesmo tenant THEN a API SHALL listar os eventos daquela pessoa.
6. WHEN um builder tenta ver log de corretor ou de outro tenant THEN a API SHALL retornar 403.
7. WHEN o admin exporta CSV THEN a resposta SHALL ser `text/csv` com as mesmas frases persistidas, sem limite de intervalo.
8. WHEN a API recebe PUT/PATCH/DELETE em um evento THEN SHALL recusar (rota inexistente / 405).
9. WHEN um evento tem mais de 5 anos THEN o command de purge SHALL removê-lo.
