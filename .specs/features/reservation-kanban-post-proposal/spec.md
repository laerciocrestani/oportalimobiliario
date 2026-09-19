---
branch: docs/kanban-dono-da-bola-colunas
status: in_progress
depends_on: reservation-kanban-queue, reservation-timeline, builder-contracts
source: docs/discovery/resumo-kanban-dono-da-bola-colunas.md
---

# Feature: reservation-kanban-post-proposal

## Problem Statement

O mapa de fila até Proposta já separa **mensagem** (badge) de **dono da bola** (etapa). Nas colunas seguintes o card ainda mistura papéis: `waiting_on` só conhece corretor/construtora, então a vez da testemunha aparece como bola da construtora (Emma 2.0); Formalização e Documentação & Sinal podem coexistir no mesmo card; “Emitir contrato” ocorre com o card ainda em Docs & Sinal, mas o CTA de fila não reflete isso.

Objetivo: fechar **quem tem a bola**, **qual CTA o dono vê** e **o que o outro lado lê** da Formalização até Vendida/Cancelada, sem reabrir a matriz A–G.

## Goals

- [ ] Porta de Formalização: o card só sai depois do PDF assinado por ambos; sem anexar sinal nessa coluna
- [ ] Docs & Sinal sequencial, um dono por card, inclusive `Emitir` ainda nessa coluna
- [ ] CTA pós-proposta: verbo da etapa para quem tem a bola; “Aguardando X” para o outro lado (nunca “Aguardando você”)
- [ ] Testemunha da vez é dono da bola distinto do gestor (`waiting_on=witness`)
- [ ] Sinal em atraso: bola permanece no corretor; alerta visível para os dois
- [ ] Vendida/Cancelada sem CTA de fila; badge de mensagem se houver não lidas

## Out of Scope

| Item | Reason |
|------|--------|
| Matriz A–G (pré-reserva / proposta) | Já entregue em `reservation-kanban-queue` |
| Chat flutuante / diálogo fora do modal | Já definido no mapa anterior |
| Contador do menu Reservas (etapa vs mensagem vs testemunha) | Lacuna aceita no mapa anterior |
| Discriminar testemunha 1 vs 2 no card | Premissa: “Aguardando testemunha” único |
| Integração GOV | Registro manual já definido na timeline |
| Regras de anexo/PDF da proposta até o aceite | Já em FLOWS.md |

---

## User Stories

### P1: Porta de Formalização ⭐ MVP

**User Story**: Como corretor, quero devolver só o PDF assinado por ambos na Formalização, para o card só ir a Docs & Sinal quando a proposta estiver formalizada.

**Why P1**: Sem a porta, a matriz “um dono / uma ação” não se sustenta (hoje o corretor pode anexar sinal e o card sai da coluna).

**Acceptance Criteria**:

1. WHEN a construtora aceitou com PDF dela e ainda não há `proposal_signed_both` THEN `kanban_column` SHALL ser `proposal_formalization` e `waiting_on` SHALL ser `broker`.
2. WHEN o corretor está na Formalização THEN o sistema SHALL expor só `return_signed_proposal` — SHALL NOT expor `submit_deposit_proof` nessa coluna.
3. WHEN o corretor envia `deposit_proof` junto com a devolução do PDF THEN the API SHALL rejeitar (422).
4. WHEN o corretor envia comprovante via `POST .../deposit-proof` ainda sem `proposal_signed_both` THEN the API SHALL rejeitar (422), **exceto** pré-reserva com hold de cliente (fluxo já existente, fora deste recorte).
5. WHEN o corretor devolve só o PDF assinado por ambos THEN o card SHALL ir para `docs_deposit` e a bola SHALL permanecer no corretor (`Anexar`).

**Independent Test**: Pest de formalização (rejeita `deposit_proof`; coluna só muda após PDF ambos) + Vitest do dialog de devolução sem campo de sinal.

### P1: Docs & Sinal sequencial ⭐ MVP

**User Story**: Como corretor ou gestor, quero um único dono da bola por vez em Documentação & Sinal, inclusive na emissão do contrato, para não haver duas ações no mesmo card.

**Why P1**: Matriz I–L do resumo; emitir permanece nesta coluna.

**Acceptance Criteria**:

1. WHEN falta comprovante (e já há PDF ambos) THEN `waiting_on=broker`, corretor vê `Anexar`, construtora vê “Aguardando corretor”.
2. WHEN comprovante enviado (`deposit_proof_pending`) THEN `waiting_on=builder`, gestor vê `Analisar`, corretor vê “Aguardando construtora”.
3. WHEN comprovante aprovado e faltam dados/docs THEN `waiting_on=broker`, corretor vê `Enviar dados`, construtora vê “Aguardando corretor”.
4. WHEN dados/docs já enviados e o PDF do contrato ainda não foi emitido THEN o card SHALL permanecer em `docs_deposit`; `waiting_on=builder`; gestor vê `Emitir`; corretor vê “Aguardando construtora”.
5. WHEN o contrato é emitido (`contract_issued`) THEN o card SHALL ir para a coluna `contract`.

**Independent Test**: Pest da listagem (`waiting_on` + `pending_action` + `kanban_column`) nos quatro momentos.

### P1: CTA pós-proposta (verbo × aguardando) ⭐ MVP

**User Story**: Como dono da bola, quero ver o **verbo da etapa** no card; como o outro lado, quero ler só “Aguardando corretor/construtora/testemunha”, sem “Aguardando você”.

**Why P1**: Contraste explícito com Proposta em análise (lá o label da vez é “Aguardando você”).

**Acceptance Criteria**:

1. WHEN o viewer tem a bola nas colunas Formalização / Docs & Sinal / Contrato THEN o botão do card SHALL usar o verbo (`Devolver`, `Anexar`, `Analisar`, `Enviar dados`, `Emitir`, `Registrar`, `Enviar`, `Assinar`, `Validar`).
2. WHEN o viewer não tem a bola THEN o card SHALL mostrar só o label “Aguardando corretor” | “Aguardando construtora” | “Aguardando testemunha”, sem verbo e sem “Aguardando você”.
3. WHEN a coluna é `proposal_review` THEN o comportamento atual SHALL permanecer (“Aguardando você” / “Aguardando X”).
4. WHEN o viewer é builder sem `reservations.cancel` e sem ser a testemunha da vez THEN o card SHALL NOT mostrar CTA interativo de etapa (pode mostrar o label passivo “Aguardando X”).

**Independent Test**: Vitest de `resolveKanbanCardCta` para cada momento H–Q.

### P1: Testemunha da vez (Emma 2.0) ⭐ MVP

**User Story**: Como testemunha da reserva, quero ver `Assinar` só na minha vez; como gestor ou corretor, quero ver “Aguardando testemunha”, não a ação de assinar nem “Aguardando você”.

**Why P1**: Se `waiting_on` continuar só `builder`, o gestor vê “Assinar”/“Aguardando você”.

**Acceptance Criteria**:

1. WHEN a etapa atual é testemunha 1 ou 2 THEN `waiting_on` SHALL ser `witness`.
2. WHEN o viewer é a testemunha da vez THEN o card SHALL mostrar `Assinar`.
3. WHEN o viewer é o gestor **e não** é a testemunha da vez THEN o card SHALL mostrar “Aguardando testemunha” (não `Assinar`, não “Aguardando você”).
4. WHEN o viewer é gestor **e** testemunha da vez THEN vale a vista de testemunha (`Assinar`).
5. WHEN T1 assina THEN a bola SHALL passar a T2 com os mesmos labels (`Assinar` / “Aguardando testemunha”).
6. WHEN o gestor não é T1 mas é T2 aguardando T1 THEN o card SHALL também mostrar “Aguardando testemunha”.

**Independent Test**: Pest `waiting_on=witness` + `pending_action=witness_signature` só para o user da vez; Vitest CTA gestor vs testemunha.

### P1: Sinal em atraso ⭐ MVP

**User Story**: Como corretor, quero continuar responsável por anexar o comprovante mesmo com o prazo vencido; como construtora, quero ver o atraso sem herdar a bola.

**Why P1**: Matriz I2 — a fila **não** passa para a construtora.

**Acceptance Criteria**:

1. WHEN `deposit_overdue` e ainda sem comprovante THEN `waiting_on` SHALL permanecer `broker` e o CTA do corretor SHALL ser `Anexar`.
2. WHEN o mesmo card é visto pela construtora THEN ela SHALL ver “Aguardando corretor”, não `Analisar`.
3. WHEN `deposit_overdue` THEN corretor e construtora SHALL ver alerta de atraso no card (copy: reusar a da timeline, “Prazo de sinal vencido — envie o comprovante o quanto antes.”).

**Independent Test**: Pest `waiting_on=broker` com evento `deposit_overdue`; Vitest do alerta no board.

### P1: Vendida e Cancelada ⭐ MVP

**User Story**: Como usuário do Kanban, quero cards Vendida/Cancelada sem CTA de fila, ainda vendo badge se houver mensagens não lidas.

**Why P1**: Matriz R–S; chat de Cancelada já é só leitura.

**Acceptance Criteria**:

1. WHEN `kanban_column` é `sold` ou `cancelled` THEN `resolveKanbanCardCta` SHALL ser `null`.
2. WHEN há mensagens não lidas THEN o badge SHALL continuar visível.
3. WHEN a reserva está cancelada THEN o chat SHALL permanecer só leitura (já existente; regressão).

**Independent Test**: Vitest CTA null + badge; Pest existente de cancelada.

---

## Edge Cases

- WHEN o card está em Formalização THEN anexar sinal SHALL ser impossível na API e na UI.
- WHEN há overlap legado (comprovante já enviado sem PDF ambos) THEN não migrar dados; o recorte vale para o fluxo daqui em diante.
- WHEN `waiting_on=witness` e o viewer é broker THEN o label SHALL ser “Aguardando testemunha”.
- WHEN Vendida THEN badge de mensagem pode existir; sem CTA de etapa.
- WHEN Cancelada THEN sem envio de mensagem (já definido); badge só se houver não lidas anteriores.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| REQ-RKP-001 | P1: dois sinais independentes (herdado) nestas colunas | Execute | Implementing |
| REQ-RKP-002 | P1: porta de Formalização | Tasks | Pending |
| REQ-RKP-003 | P1: Docs & Sinal sequencial + Emitir na mesma coluna | Tasks | Pending |
| REQ-RKP-004 | P1: CTA verbo × “Aguardando X”; sem “Aguardando você” | Tasks | Pending |
| REQ-RKP-005 | P1: testemunha da vez (`waiting_on=witness`) | Execute | Implementing |
| REQ-RKP-006 | P1: sinal em atraso permanece no corretor + alerta | Tasks | Pending |
| REQ-RKP-007 | P1: Vendida/Cancelada sem CTA de fila | Execute | Implementing |
| REQ-RKP-008 | P1: builder sem gestão e sem vez de testemunha sem CTA interativo | Tasks | Pending |

**Coverage:** 8 total, mapped in tasks.md

---

## Success Criteria

- [ ] Formalização: só `Devolver`; comprovante 422 até PDF ambos
- [ ] Docs & Sinal: um dono por vez; `Emitir` ainda nesta coluna
- [ ] Emma 2.0: gestor não-testemunha vê “Aguardando testemunha”; testemunha da vez vê `Assinar`
- [ ] Corretor na vez pós-proposta vê o verbo, nunca “Aguardando você”
- [ ] Sinal atrasado: `Anexar` + alerta; bola não passa à construtora
- [ ] Sem regressão na matriz A–G
