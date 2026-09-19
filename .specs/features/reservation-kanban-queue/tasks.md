# Tasks: reservation-kanban-queue

**Design**: `.specs/features/reservation-kanban-queue/design.md`  
**Status**: Done

Gate commands (TESTING.md):

- Backend: `docker compose exec backend php artisan test --compact --filter=ReservationKanbanQueue`
- Frontend: `docker compose exec frontend pnpm test` nos arquivos tocados
- Feature tests Laravel = integration (não parallel-safe com SQLite compartilhado no mesmo processo de suite — tasks BE sequenciais)

---

## Execution Plan

```
T1 → T2 → T3 → T4 → T5 → T6
```

Backend (T1–T3) antes do frontend (T4–T5). T6 índices.

---

## Task Breakdown

### T1: Persistência de leitura

**What**: Migration `reservation_message_reads` + model + factory + `Reservation::messageReads()`
**Where**: `backend/database/migrations/`, `backend/app/Models/ReservationMessageRead.php`, `backend/database/factories/ReservationMessageReadFactory.php`, `backend/app/Models/Reservation.php`
**Depends on**: None
**Reuses**: `ReservationMessage` model/factory
**Requirement**: REQ-RKQ-002

**Tools**: Docker artisan `make:model --pest` / `make:migration`; skill `laravel-best-practices`

**Done when**:

- [x] Tabela com unique `(reservation_id, user_id)` e FK `last_read_message_id` nullOnDelete
- [x] Factory cria read válido
- [x] Relação `messageReads` no Reservation

**Tests**: none (entity) — coberto em T2  
**Gate**: build — `docker compose exec backend php artisan test --compact --filter=ReservationKanbanQueue` (ainda sem testes; migration carrega na suite)

**Commit**: `feat(reservations): persist message read cursor per user`

---

### T2: Service unread + list + mark on timeline/message

**What**: `ReservationMessageReadService`; `unread_messages_count` e `needs_reply` na listagem; `markRead` no GET timeline e POST message; `pending_action=reply` só em `pre_hold`
**Where**: `ReservationMessageReadService.php`, `ReservationPendingReplyService.php`, timeline + message controllers (builder/broker), `docs/api/openapi.yaml`
**Depends on**: T1
**Reuses**: `formatListItem`, controllers existentes
**Requirement**: REQ-RKQ-001, REQ-RKQ-002, REQ-RKQ-003, REQ-RKQ-004

**Tools**: skill `pest-testing`, `laravel-best-practices`

**Done when**:

- [x] Feature test: N msgs da outra parte → count N; próprias → 0
- [x] GET timeline zera count daquele user; outro builder do tenant não zera
- [x] POST message marca lido para o autor
- [x] `proposal_pending` + msgs do builder: broker `pending_action` ≠ `reply`; `waiting_on=builder`; `unread_messages_count` > 0
- [x] Matriz pré-reserva A–C: `waiting_on` + `pending_action` (start_dialogue / reply)
- [x] `proposal_returned`: `waiting_on=broker`
- [x] OpenAPI com `unread_messages_count`
- [x] Gate: `docker compose exec backend php artisan test --compact --filter=ReservationKanbanQueue`
- [x] Test count: ≥ 8 examples, 0 skipped

**Tests**: integration (Pest Feature)  
**Gate**: full (arquivo Pest)

**Commit**: `feat(reservations): count unread messages and mark read on timeline`

---

### T3: CTA de fila no Kanban (FE)

**What**: `unread_messages_count` no tipo; `resolveKanbanCardCta` conforme design; badge no card
**Where**: `frontend/src/lib/api.ts`, `reservation-kanban.ts`, `ReservationKanbanBoard.tsx` + testes
**Depends on**: T2 (contrato)
**Reuses**: `WAITING_ON_LABEL`, board atual
**Requirement**: REQ-RKQ-001, REQ-RKQ-003, REQ-RKQ-004

**Tools**: skill `vercel-react-best-practices`

**Done when**:

- [x] Emma broker: “Aguardando construtora” mesmo com `needs_action`/reply legado
- [x] Emma builder: “Aguardando você”
- [x] Pré-reserva sem ação: “Aguardando corretor/construtora”
- [x] Badge `(N)` visível se `unread_messages_count > 0`; ausente se 0
- [x] Gate: `docker compose exec frontend pnpm test src/components/reservations/reservation-kanban.test.ts src/components/reservations/ReservationKanbanBoard.test.tsx`

**Tests**: unit (Vitest)  
**Gate**: quick

**Commit**: `feat(reservations): split kanban queue CTA from unread badge`

---

### T4: Diálogo só no modal

**What**: Remover `ReservationMessagesDialog` das páginas Kanban; kebab abre andamento
**Where**: `ReservationActionsMenu.tsx`, `ReservationKanbanBoard.tsx`, `ReservationsPage.tsx`, `BrokerReservationsPage.tsx` + testes
**Depends on**: T3
**Reuses**: `ReservationProgressDialog` + `ReservationChatPanel`
**Requirement**: REQ-RKQ-005

**Done when**:

- [x] Menu não tem item que abra dialog só de mensagens; “Ver conversa” / andamento → `onTimeline`
- [x] Páginas Kanban sem `ReservationMessagesDialog`
- [x] Dialog de andamento chama `onTimelineRefresh` após GET timeline (badge some)
- [x] Gate: Vitest menu + páginas + `ReservationProgressDialog.test.tsx`

**Tests**: unit (Vitest)  
**Gate**: quick

**Commit**: `feat(reservations): keep kanban chat inside progress dialog`

---

### T5: Confirmar recusa/devolução (sem mapa extra)

**What**: Garantir Pest existente de recusa→cancelada e devolução→`proposal_returned` na coluna review; adicionar asserts de `waiting_on` se faltar
**Where**: `backend/tests/Feature/Reservations/ReservationProposalTest.php` e/ou `ReservationKanbanQueueTest.php`
**Depends on**: T2
**Requirement**: REQ-RKQ-006

**Done when**:

- [x] Recusa → `cancelled` (já coberto; regressão verde)
- [x] Devolução → `waiting_on=broker` + coluna `proposal_review`
- [x] Gate: `docker compose exec backend php artisan test --compact --filter=ReservationKanbanQueue`

**Tests**: integration  
**Gate**: full

**Commit**: `test(reservations): assert proposal return waiting_on broker`

---

### T6: Índices

**What**: TRACEABILITY, FRONTEND, FLOWS (nota fila vs mensagem), STATE, ROADMAP
**Where**: `.specs/codebase/*`, `.specs/project/*`
**Depends on**: T1–T5
**Requirement**: todos

**Tests**: none  
**Gate**: docs

**Commit**: `docs: trace reservation-kanban-queue`

---

## Task Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1 | 1 tabela + model | ✅ |
| T2 | service + wire API + Pest (coeso) | ⚠️ 2-3 no mesmo arquivo de contrato — OK |
| T3 | CTA + badge no board | ✅ |
| T4 | remover dialog paralelo | ✅ |
| T5 | asserts regressão | ✅ |
| T6 | docs | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram | Status |
|------|------------|---------|--------|
| T1 | None | start | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | T2 | T2→T5 (pode paralelo a T3; suite BE vs FE) | ✅ Match — executamos T5 após T2, antes ou após T3 |
| T6 | T1–T5 | end | ✅ |

T5 não depende de T3/T4 (só BE). Ordem prática: T1 T2 T5 T3 T4 T6.

## Test Co-location Validation

| Task | Layer | Matrix | Task Says | Status |
|------|-------|--------|-----------|--------|
| T1 | migration/model | none | none | ✅ |
| T2 | service + endpoint | Feature Pest | integration | ✅ |
| T3 | component | Vitest | unit | ✅ |
| T4 | component | Vitest | unit | ✅ |
| T5 | endpoint | Feature Pest | integration | ✅ |
| T6 | docs | none | none | ✅ |
