# Reserva direta — Tasks

**Design**: `.specs/features/reservation-direct-proposal/design.md`
**Spec**: `.specs/features/reservation-direct-proposal/spec.md`
**Status**: In Progress

Ferramentas de todas as tasks: Docker Compose, Pest no backend, Vitest no frontend. Skills: `laravel-best-practices`, `pest-testing`, `opim-conventions`. Sem MCP externo.

## Execution Plan

### Fase 1 — Relógio e campos

```
T1 → T2 → T3
```

### Fase 2 — Rascunho e Kanban

```
T3 → T4 → T5 → T6
```

### Fase 3 — Análise

```
T6 → T7 → T8
```

### Fase 4 — Config e ZapSign da proposta

```
T8 → T9 → T10 → T11
```

### Fase 5 — Sinal, contrato, lembrete

```
T11 → T12 → T13 → T14
```

## Task Breakdown

### T1: Relógio de horas úteis

**What**: `BusinessClock` soma horas pulando sábado, domingo e feriado nacional, no fuso de Brasília.
**Where**: `backend/app/Support/BusinessClock.php`, `backend/app/Support/BrazilianNationalHolidays.php`
**Depends on**: None
**Reuses**: nenhum prazo útil existente
**Requirement**: REQ-RDP-004

**Done when**:

- [x] Sexta 16h + 48h úteis cai na terça 16h
- [x] Sábado não consome o prazo
- [x] Sexta-feira Santa não consome o prazo
- [x] Gate: `docker compose exec backend php artisan test --compact tests/Unit/Support/BusinessClockTest.php`

**Tests**: unit
**Gate**: quick

### T2: Tabela de feriados nacionais

**What**: Persistir os feriados nacionais (fixos + Sexta-feira Santa) de 2026 a 2032.
**Where**: `backend/database/migrations/2026_10_06_120000_create_national_holidays_table.php`, `backend/app/Models/NationalHoliday.php`
**Depends on**: T1
**Reuses**: `BrazilianNationalHolidays`
**Requirement**: REQ-RDP-004

**Done when**:

- [x] Migration cria `national_holidays` e grava o calendário
- [x] 2026-04-03 existe; carnaval de 2026 não entra
- [x] Gate do mesmo teste de T1, com o caso que lê a tabela

**Tests**: unit
**Gate**: quick

### T3: Campos de prazo na reserva

**What**: Status `proposal_draft`, `proposal_signing` e `contract_signing`, mais `draft_expires_at` e `review_deadline_at`.
**Where**: `backend/app/Enums/ReservationStatus.php`, `backend/app/Models/Reservation.php`, migration de colunas
**Depends on**: T2
**Reuses**: `reservations.status` string
**Requirement**: REQ-RDP-001, REQ-RDP-004

**Done when**:

- [x] Colunas nulas existem e o model faz cast
- [x] Helpers `isProposalDraft()` e `isProposalSigning()` existem
- [x] Fluxo antigo de pré-reserva continua passando nos testes existentes

**Tests**: unit no model via feature já existente de pré-reserva
**Gate**: `docker compose exec backend php artisan test --compact tests/Feature/Reservations/PreReservationTest.php`

### T4: Rascunho de 20 minutos

**What**: Reservar cria rascunho, trava a unidade e expira em 20 minutos corridos sem aparecer para a construtora.
**Where**: `backend/app/Services/ProposalDraftService.php`, rota broker, command de expiração
**Depends on**: T3
**Reuses**: lock de `PreReservationService`
**Requirement**: REQ-RDP-001, REQ-RDP-002

**Done when**:

- [x] Segundo corretor recebe 422 na mesma unidade
- [x] Command libera a unidade após 20 minutos
- [x] Listagem da construtora não devolve o rascunho
- [x] Pest cobre happy path, 401 e 422

**Tests**: feature
**Gate**: quick no arquivo novo

### T5: Coluna Pré-reserva fora do Kanban

**What**: Os dois portais deixam de renderizar Pré-reserva. O corretor retoma o rascunho pela unidade.
**Where**: `frontend/src/components/reservations/reservation-kanban.ts`, `BrokerUnitsDialog.tsx`
**Depends on**: T4
**Reuses**: `RESERVATION_KANBAN_COLUMNS`
**Requirement**: REQ-RDP-011

**Done when**:

- [x] O board tem 6 colunas
- [x] O botão da unidade é Reservar
- [x] Vitest do kanban e do diálogo de unidades passa

**Tests**: unit (Vitest)
**Gate**: `docker compose exec frontend pnpm test` nos arquivos do kanban e do diálogo

### T6: Cancelar pré-reservas atuais

**What**: Migration cancela reservas `pre_hold` e libera a unidade quando não houver outro fluxo ativo.
**Where**: migration de dados
**Depends on**: T5
**Reuses**: `ReservationCancellationService` como referência, sem apagar histórico de proposta já enviada
**Requirement**: REQ-RDP-011

**Done when**:

- [x] `pre_hold` existente vira `cancelled` e a unidade volta a `available`
- [x] `proposal_pending` não é cancelada
- [x] Pest cobre a migration ou um command idempotente

**Tests**: feature
**Gate**: quick

### T7: Envio da proposta para análise

**What**: Enviar a proposta com dados básicos muda o status para `proposal_pending` e grava `review_deadline_at` com 48 horas úteis.
**Where**: `ProposalReviewService`, endpoint de envio
**Depends on**: T6
**Reuses**: `ReservationProposalService`, `BusinessClock`
**Requirement**: REQ-RDP-003, REQ-RDP-004

**Done when**:

- [x] Sem nome ou telefone a API responde 422
- [x] O card da construtora aparece em Proposta em análise
- [x] O prazo cai em hora útil

**Tests**: feature
**Gate**: quick

### T8: Aceite, recusa, substituição e prorrogação

**What**: Construtora aceita ou recusa. Corretor substitui e o prazo reinicia. Prorrogação soma horas úteis. Fim do prazo recusa.
**Where**: `ProposalReviewService`, command de expiração da análise
**Depends on**: T7
**Reuses**: decisão de proposta já existente, sem `proposal_returned` novo
**Requirement**: REQ-RDP-004, REQ-RDP-005

**Done when**:

- [x] Devolução nova responde 422
- [x] Substituição regrava o deadline
- [x] +X horas soma no deadline atual
- [x] Command no fim do prazo cancela e libera a unidade

**Tests**: feature
**Gate**: quick

### T9: Config geral de assinatura

**What**: A construtora grava o signatário da proposta e N vagas de testemunha, com opção de vaga do corretor da venda.
**Where**: model, rotas builder, tela de config
**Depends on**: T8
**Reuses**: permissões de equipe
**Requirement**: REQ-RDP-008

**Done when**:

- [x] Config é por tenant e isolada de outra construtora
- [x] N=3 aceita 2 pessoas do time e a vaga do corretor
- [x] Pest cobre 401, 403, 422 e isolamento

**Tests**: feature + Vitest do formulário
**Gate**: quick

### T10: Gateway ZapSign da proposta

**What**: No aceite, o PDF local é gerado e um job cria o documento na conta da plataforma.
**Where**: `backend/app/Services/ZapSign/`, `signature_documents`
**Depends on**: T9
**Reuses**: renderer de PDF de proposta
**Requirement**: REQ-RDP-006

**Done when**:

- [x] Falha do ZapSign não desfaz o aceite
- [x] Webhook idempotente atualiza o signatário
- [x] As três assinaturas movem o card para a etapa seguinte
- [x] Recusa de um signatário não libera a unidade

**Tests**: feature com HTTP fake
**Gate**: quick

### T11: Links de assinatura

**What**: WhatsApp e e-mail no envio, e botão de reenvio para corretor e construtora.
**Where**: notificador, endpoints broker e builder
**Depends on**: T10
**Reuses**: `WhatsAppCloudApiService`
**Requirement**: REQ-RDP-007

**Done when**:

- [x] Com e-mail, os dois canais são chamados
- [x] Sem e-mail, só WhatsApp
- [x] Botão reenvia para quem ainda não assinou

**Tests**: feature
**Gate**: quick

### T12: Lembrete diário às 8h

**What**: Command agenda um aviso por signatário pendente, todo dia às 8h em `America/Sao_Paulo`.
**Where**: command + `routes/console.php`
**Depends on**: T11
**Reuses**: o notificador de T11
**Requirement**: REQ-RDP-007

**Done when**:

- [x] O schedule está em `0 8 * * *` no fuso de Brasília
- [x] Rodar duas vezes no mesmo dia não duplica o aviso automático

**Tests**: feature
**Gate**: quick

### T13: Tipo de sinal

**What**: PIX só depois das três assinaturas. Bem embutido na proposta não pede valor.
**Where**: snapshot da proposta, `DepositPolicy`, kanban
**Depends on**: T10
**Reuses**: coluna `docs_deposit`
**Requirement**: REQ-RDP-009

**Done when**:

- [x] Proposta `asset` não exige comprovante de PIX
- [x] Proposta `pix` permanece em Documentação & Sinal até o comprovante
- [x] O aceite sozinho não abre o PIX

**Tests**: feature + Vitest
**Gate**: quick

### T14: Contrato no ZapSign

**What**: Dados completos do cliente antes do PDF. Testemunhas resolvidas na reserva. Assinatura no ZapSign.
**Where**: fluxo de emissão de contrato
**Depends on**: T9, T13
**Reuses**: `ContractIssueService`, gateway de T10
**Requirement**: REQ-RDP-010

**Done when**:

- [x] Falta CPF ou endereço e a emissão responde 422
- [x] A vaga do corretor usa o corretor da reserva
- [x] Mudar a config depois não altera documento já enviado

**Tests**: feature
**Gate**: quick

## Cross-check de dependências

| Task | Depends on | Diagrama |
|------|------------|----------|
| T1 | None | início da fase 1 |
| T2 | T1 | T1 → T2 |
| T3 | T2 | T2 → T3 |
| T4 | T3 | T3 → T4 |
| T5 | T4 | T4 → T5 |
| T6 | T5 | T5 → T6 |
| T7 | T6 | T6 → T7 |
| T8 | T7 | T7 → T8 |
| T9 | T8 | T8 → T9 |
| T10 | T9 | T9 → T10 |
| T11 | T10 | T10 → T11 |
| T12 | T11 | T11 → T12 |
| T13 | T10 | T10 → T13 |
| T14 | T9, T13 | T13 → T14 e T9 → T14 |

## Testes no mesmo commit da task

| Task | Camada | Tipo exigido | Nesta task |
|------|--------|--------------|------------|
| T1–T3 | support / model | unit | sim |
| T4, T6–T8, T10–T14 | endpoint ou command | feature Pest | sim |
| T5, T9, T13 | UI | Vitest | sim |
| T9, T4 | API | 401/403/422 e tenant | sim |
