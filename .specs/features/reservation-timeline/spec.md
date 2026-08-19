---
branch: main
status: in_progress
depends_on: reservations, reservation-pre-hold, builder-reservations
source: reuniao L37-L65
---

# Feature: reservation-timeline

## Objetivo

Cada reserva possui um **timeline** que registra e exibe todas as etapas do fluxo de negócio — da pré-reserva até a venda — conforme definido na reunião de produto.

O corretor inicia sempre com pré-reserva, troca informações com a construtora, envia proposta, aguarda aprovação do gestor, coleta sinal, envia documentação e contrato assinado. O gestor valida em cada gate até marcar a unidade como vendida.

## Atores

| Ator | Portal | Permissão |
|------|--------|-----------|
| Corretor | `corretor` | ownership da reserva (`broker_id`) |
| Gestor (construtora) | `construtora` | `reservations.cancel` (alias gestor de reservas) |

## Requisitos funcionais

### Fase 1 — Pré-reserva e diálogo

- `REQ-RTL-001`: Corretor inicia pré-reserva (`pre_hold`, TTL 10 min) — **já implementado** (`REQ-RES-005`)
- `REQ-RTL-002`: Corretor e gestor trocam informações via thread de mensagens durante pré-reserva — **já implementado** (`REQ-BLD-RES-003`, `REQ-BLD-RES-005`)
- `REQ-RTL-003`: Timeline exibe etapa **Pré-reserva** (`pre_hold_created`) com data/ator
- `REQ-RTL-004`: Timeline exibe etapa **Diálogo** (`dialogue`) vinculada à thread existente (contagem de mensagens, link para abrir)

### Fase 2 — Proposta

- `REQ-RTL-005`: Após diálogo, corretor envia **proposta** com formulário:
  - `client_name`, `client_email`, `client_phone`, `client_cpf`
  - `address`, `city`, `state`, `zip`
  - `marital_status`, `nationality`
  - `land_value` (valor do terreno)
  - `payment_terms` (observações de pagamento, ex: "pix 10 mil + terreno + 24x 5 mil")
- `REQ-RTL-006`: Proposta é snapshot — dados independentes do cadastro `broker_clients` no momento do envio
- `REQ-RTL-007`: Envio da proposta muda `stage` para `proposal_pending`; unidade permanece `pre_reserved`
- `REQ-RTL-008`: Gestor decide proposta: `accepted` | `rejected` | `returned` + `decision_note` opcional
- `REQ-RTL-009`: **Aceita** → `stage` = `deposit_pending`, unidade → `reserved`, TTL 48h inicia para sinal
- `REQ-RTL-010`: **Recusada** → `stage` = `cancelled`, unidade → `available`, timeline encerra
- `REQ-RTL-011`: **Devolvida** → `stage` = `proposal_returned`, corretor pode reenviar proposta corrigida
- `REQ-RTL-012`: Timeline exibe etapas **Proposta enviada** e **Decisão do gestor** com status e nota

### Fase 3 — Sinal (depósito)

- `REQ-RTL-013`: Após aceite, janela de 48h para envio do sinal (`deposit_window_opened`)
- `REQ-RTL-014`: Se prazo vencer sem comprovante, sistema gera evento `deposit_overdue` e notifica corretor **e** gestor (alerta, sem cancelamento automático — ver decisões pendentes)
- `REQ-RTL-015`: Corretor anexa comprovante de pagamento (`deposit_proof`) → `stage` = `deposit_proof_pending`
- `REQ-RTL-016`: Gestor aprova comprovante → `stage` = `contract_data_pending`, libera coleta de dados para contrato
- `REQ-RTL-017`: Da etapa pós-aceite até validação final do contrato, unidade permanece `reserved` ("sempre reservado")

### Fase 4 — Contrato e venda

- `REQ-RTL-018`: Corretor envia dados do cliente + fotos da documentação (`contract_documentation` attachments); corretor **não** vê contrato completo
- `REQ-RTL-019`: Gestor emite contrato PDF (`contract_issued`) via botão emitir/aprovar após conferência dos documentos
- `REQ-RTL-020`: PDF enviado ao corretor; registro manual de assinatura GOV (cliente + corretor) — sem integração gov.br na v1
- `REQ-RTL-021`: Corretor envia contrato assinado (`contract_signed` attachment) → `stage` = `contract_uploaded`
- `REQ-RTL-022`: Gestor valida contrato assinado, assina GOV (registro manual), marca unidade → `sold` → `stage` = `sold`
- `REQ-RTL-023`: Timeline exibe todas as etapas de contrato com anexos vinculados

### API e UI

- `REQ-RTL-024`: `GET /api/broker/reservations/{id}/timeline` — corretor dono da reserva
- `REQ-RTL-025`: `GET /api/builder/reservations/{id}/timeline` — gestor com `reservations.cancel` + mesmo tenant
- `REQ-RTL-026`: Resposta inclui `current_stage`, `expires_at`, `steps[]` com `status`: `completed` | `current` | `upcoming` | `skipped` | `failed`
- `REQ-RTL-027`: Componente `ReservationTimeline` reutilizado em `BrokerReservationsPage` e `ReservationsPage` (builder)
- `REQ-RTL-028`: Step `current` expõe `actions[]` com CTAs contextuais por perfil

### Auditoria

- `REQ-RTL-029`: Toda transição de stage grava evento em `reservation_timeline_events` (append-only)
- `REQ-RTL-030`: Após `reserved`, cancelamentos usam soft `cancelled` + evento (preserva histórico; não hard delete)

## Alinhamento com implementação atual

| Comportamento atual | Comportamento alvo |
|---------------------|-------------------|
| `PATCH confirm` → `confirmed` + `reserved` | `PATCH confirm` é alias de `POST /proposal` → `proposal_pending`; unidade permanece `pre_reserved` |
| TTL 48h na confirmação | TTL 48h inicia **após aceite da proposta** (sinal); envio da proposta zera `expires_at` |
| `observations` no confirm | Vira `payment_terms` na proposta |
| Hard delete em cancelamento | Hard delete apenas em `pre_hold`; recusa/cancelamento posterior = `cancelled` (unique parcial por unidade ativa) |

> Detalhes técnicos: [design.md](./design.md)

## Decisões v1

Registradas em [design.md § Decisões pendentes](./design.md#decisões-pendentes). Adotadas para a v1:

| # | Tema | Decisão v1 |
|---|------|------------|
| D-01 | Cancelamento após `reserved` | Gestor pode cancelar até `contract_uploaded`; corretor só cancela em `pre_hold` (hard delete) e `proposal_returned`. Recusa de proposta = `cancelled` sem apagar o histórico. |
| D-02 | Assinatura GOV | Registro manual + upload (sem API gov.br) — Fase D |
| D-03 | Geração PDF contrato | Template automático do tenant (`builder-contracts`); reemissão até existir assinado |
| D-04 | Expiração do sinal | Alerta apenas (`opim:check-deposit-windows`); não cancela |
| D-05 | Migração `confirmed` | `confirmed` trata-se como `deposit_pending` no código (`isDepositPending`) |

## Dependências

- `reservations`, `reservation-pre-hold`, `builder-reservations`
- Upload de arquivos (padrão `BuildingMediaController`)

## Status

**in_progress** — Fases A–C implementadas. Fase B alinhada (`POST /proposal`, `PATCH confirm` alias, TTL pós-aceite, recusa soft). Fase D: GOV + contrato assinado + `sold`.
