# Tasks: reservation-kanban-post-proposal

**Design**: `.specs/features/reservation-kanban-post-proposal/design.md`  
**Status**: In Progress

Gate commands (TESTING.md):

Gate commands (TESTING.md):

- Backend: `docker compose exec backend php artisan test --compact --filter=ReservationKanbanPostProposal`
- Frontend: `docker compose exec frontend pnpm test` nos arquivos tocados
- Feature tests Laravel = integration (não parallel-safe com SQLite compartilhado — tasks BE sequenciais)

---

## Execution Plan

```
T1 → T2 → T3 → T4 → T5 → T6
```

Backend (T1–T3) antes do frontend (T4–T5). T6 índices.

```
Phase 1 (BE sequential):
  T1 → T2 → T3

Phase 2 (FE sequential; contrato T1–T3):
  T4 → T5

Phase 3:
  T6
```

---

## Task Breakdown

### T1: `waiting_on=witness` + OpenAPI

**What**: `resolveWaitingOn` devolve `witness` em `contract_witness_1/2`; OpenAPI enum; Pest da matriz H–S de `waiting_on` (incl. testemunha e gestor que também é T da vez)
**Where**: `backend/app/Services/ReservationTimelineService.php`, `docs/api/openapi.yaml`, `backend/tests/Feature/Reservations/ReservationKanbanPostProposalTest.php`
**Depends on**: None
**Reuses**: `ReservationKanbanQueueTest.php` (padrão de listagem), factories de witness
**Requirement**: REQ-RKP-001, REQ-RKP-005, REQ-RKP-007

**Tools**: skill `laravel-best-practices`, `pest-testing`

**Done when**:

- [x] `waiting_on` OpenAPI enum `broker | builder | witness`
- [x] Formalização (PDF construtora, sem ambos): `waiting_on=broker`, coluna `proposal_formalization`
- [x] Docs & Sinal I/J/K/L: broker / builder / broker / builder; L permanece `docs_deposit`
- [x] Contrato M–Q: broker / broker / builder / witness / builder; sold/cancelled → `null`
- [x] Testemunha da vez: `waiting_on=witness`; `pending_action=witness_signature` só para o user da vez; gestor não-T vê `pending_action` ≠ `witness_signature`
- [x] Gestor que é a testemunha da vez: `pending_action=witness_signature`
- [x] Gate: `docker compose exec backend php artisan test --compact --filter=ReservationKanbanPostProposal`
- [x] Test count: ≥ 8 examples, 0 skipped

**Tests**: integration (Pest Feature)  
**Gate**: full

**Commit**: `feat(reservations): distinguish witness as kanban waiting party`

---

### T2: Porta de Formalização (API)

**What**: `canSubmitDepositProof` exige `proposal_signed_both` (exceto client hold); rejeitar `deposit_proof` em `returnSigned`; timeline da Formalização só `return_signed_proposal`
**Where**: `Reservation.php`, `ReservationProposalService.php`, `ReservationProposalController` (broker), `ReservationTimelineService.php` (`depositWindowBrokerActions`), OpenAPI do POST signed, testes no mesmo Pest de T1
**Depends on**: T1
**Reuses**: `ProposalFormalizationTest.php` (atualizar o caso que envia comprovante junto)
**Requirement**: REQ-RKP-002

**Tools**: skill `laravel-best-practices`, `pest-testing`

**Done when**:

- [x] POST signed com `deposit_proof` → 422
- [x] POST deposit-proof sem PDF ambos (reserva aceita) → 422
- [x] POST signed só com PDF → 200, coluna `docs_deposit`, `waiting_on=broker`
- [x] Timeline broker na Formalização: actions contém `return_signed_proposal` e não `submit_deposit_proof`
- [x] Pré-hold com cliente ainda pode anexar sinal (regressão `ReservationHoldTest` / deposit na pré-reserva)
- [x] Gate: `docker compose exec backend php artisan test --compact --filter=ReservationKanbanPostProposal`
- [x] Também verde: `--filter=ProposalFormalization`
- [x] Test count: sem silent deletions na suite tocada

**Tests**: integration  
**Gate**: full

**Commit**: `fix(reservations): keep deposit proof out of formalization`

---

### T3: `pending_action` sequencial (Emitir + Formalização)

**What**: Gestor recebe `issue_contract` quando a etapa é emitir (dados já enviados, ainda `contract_data_pending`); broker na Formalização não recebe `submit_deposit_proof`; overdue não muda `waiting_on`
**Where**: `ReservationPendingReplyService.php`, Pest T1
**Depends on**: T2
**Reuses**: `pendingActionForBroker` / `pendingActionForBuilder`
**Requirement**: REQ-RKP-003, REQ-RKP-004, REQ-RKP-006, REQ-RKP-008

**Done when**:

- [x] Broker Formalização: `pending_action=return_signed_proposal`
- [x] Broker I / I2: `submit_deposit_proof`; `deposit_overdue` + sem comprovante → `waiting_on=broker`
- [x] Gestor J: `deposit_proof_approval`; K broker `submit_contract_data`; L gestor `issue_contract` e coluna `docs_deposit`
- [x] Builder sem `reservations.cancel` e sem vez de testemunha: `pending_action=null`
- [x] Gate: `docker compose exec backend php artisan test --compact --filter=ReservationKanbanPostProposal`

**Tests**: integration  
**Gate**: full

**Commit**: `feat(reservations): expose issue_contract pending action on docs column`

---

### T4: CTA pós-proposta no Kanban (FE)

**What**: Tipo `witness`; `resolveKanbanCardCta` usa verbo se `needs_action` nas colunas H–Q; outro lado “Aguardando X”; allowlist `issue_contract` em `docs_deposit`; `ReservationWaitingStatus` com testemunha
**Where**: `frontend/src/lib/api.ts`, `reservation-kanban.ts`, `ReservationWaitingStatus.tsx` + testes
**Depends on**: T1, T3 (contrato)
**Reuses**: `KANBAN_CARD_ACTIONS`, board atual
**Requirement**: REQ-RKP-001, REQ-RKP-003, REQ-RKP-004, REQ-RKP-005, REQ-RKP-007, REQ-RKP-008

**Tools**: skill `vercel-react-best-practices`

**Done when**:

- [ ] H broker: botão `Devolver`; builder: hint “Aguardando corretor”, sem “Aguardando você”
- [ ] L builder: `Emitir`; broker: “Aguardando construtora”
- [ ] P testemunha: `Assinar`; gestor não-T e corretor: “Aguardando testemunha”
- [ ] `proposal_review` inalterado (Emma original)
- [ ] sold/cancelled: CTA null
- [ ] `visibleColumnActions('docs_deposit')` inclui `issue_contract`
- [ ] Gate: `docker compose exec frontend pnpm test src/components/reservations/reservation-kanban.test.ts src/components/reservations/ReservationWaitingStatus.test.tsx`

**Tests**: unit (Vitest)  
**Gate**: quick

**Commit**: `feat(reservations): show post-proposal kanban verbs and witness wait`

---

### T5: UI porta + alerta de atraso

**What**: Remover comprovante do dialog de devolução; alerta de sinal atrasado no card; regressão Vitest do board
**Where**: `BrokerReturnSignedProposalDialog.tsx`, `api.ts` (`returnSignedProposal` sem deposit), `ReservationKanbanBoard.tsx` + testes
**Depends on**: T2, T4
**Reuses**: copy da timeline (`Prazo de sinal vencido — envie o comprovante o quanto antes.`)
**Requirement**: REQ-RKP-002, REQ-RKP-006

**Done when**:

- [ ] Dialog de devolução não tem campo de comprovante; API chamada só com PDF
- [ ] Card `docs_deposit` + `deposit_overdue` mostra o alerta para broker e builder
- [ ] Card sem overdue não mostra o alerta
- [ ] Gate: `docker compose exec frontend pnpm test src/components/reservations/BrokerReturnSignedProposalDialog.test.tsx src/components/reservations/ReservationKanbanBoard.test.tsx`

**Tests**: unit (Vitest)  
**Gate**: quick

**Commit**: `feat(reservations): block deposit on return dialog and show overdue alert`

---

### T6: Índices

**What**: TRACEABILITY, FRONTEND, FLOWS (porta Formalização + `waiting_on=witness`), GLOSSARY, STATE, ROADMAP
**Where**: `.specs/codebase/*`, `.specs/project/*`
**Depends on**: T1–T5
**Requirement**: todos

**Tests**: none  
**Gate**: docs

**Commit**: `docs: trace reservation-kanban-post-proposal`

---

## Task Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1 | waiting_on + Pest matriz | ⚠️ service + OpenAPI + testes no mesmo contrato — OK |
| T2 | porta Formalização API | ⚠️ model + service + testes — OK cohesivo |
| T3 | pending_action sequencial | ✅ |
| T4 | CTA + tipos + waiting status | ⚠️ 2-3 arquivos FE do mesmo contrato — OK |
| T5 | dialog + alerta card | ✅ |
| T6 | docs | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
|------|-------------------|---------|--------|
| T1 | None | start | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T1, T3 | T3→T4 (T1 já feito) | ✅ |
| T5 | T2, T4 | T4→T5 | ✅ |
| T6 | T1–T5 | end | ✅ |

T4 não depende de T5. T3 não depende de FE.

## Test Co-location Validation

| Task | Layer | Matrix | Task Says | Status |
|------|-------|--------|-----------|--------|
| T1 | service + listagem | Feature Pest | integration | ✅ |
| T2 | model + endpoint | Feature Pest | integration | ✅ |
| T3 | service listagem | Feature Pest | integration | ✅ |
| T4 | component/lib | Vitest | unit | ✅ |
| T5 | component | Vitest | unit | ✅ |
| T6 | docs | none | none | ✅ |
