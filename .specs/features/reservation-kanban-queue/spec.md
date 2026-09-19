---
branch: feature/reservation-garage-spots
status: done
depends_on: reservation-progress-flex, reservation-timeline
source: docs/discovery/resumo-kanban-fila-e-mensagens.md
---

# Feature: reservation-kanban-queue

## Problem Statement

No Kanban de reservas o card misturava **mensagem nova** com **próxima ação de etapa**. Caso Emma: corretor já enviou a proposta (coluna Proposta em análise; bola da construtora), mas corretor e construtora podiam ver “Aguardando você”.

Objetivo: dois sinais independentes no card até a fase de proposta (aceite / devolução / recusa). Colunas após aceite (sinal, contrato, venda) ficam para o próximo mapa.

## Goals

- [ ] Badge de mensagens não lidas (contagem) independente do dono da bola
- [ ] CTA de etapa alinhado à matriz de fila até proposta
- [ ] Abrir o modal de andamento marca mensagens como lidas (por usuário)
- [ ] Diálogo só dentro do modal do card (sem chat paralelo no Kanban)

## Out of Scope

| Item | Reason |
|------|--------|
| Formalização, sinal, contrato, vendida | Próximo discovery |
| Contador global do menu Reservas (etapa vs mensagem) | Lacuna aceita no resumo |
| “Lido por papel/tenant” | Premissa: leitura por usuário autenticado |
| Regras de anexos/PDF da proposta | Já documentado em FLOWS.md |
| Chat na listagem de unidades (`BrokerUnitsDialog`) | Fora do Kanban |

---

## User Stories

### P1: Dois sinais no card ⭐ MVP

**User Story**: Como corretor ou gestor, quero ver no card **quem tem a bola da etapa** e, à parte, **quantas mensagens novas** da outra parte, para não confundir “preciso responder o chat” com “preciso decidir a proposta”.

**Why P1**: Corrige o bug Emma e é o núcleo do resumo confirmado.

**Acceptance Criteria**:

1. WHEN o card é renderizado THEN o sistema SHALL poder exibir badge de não lidas **e** label/CTA de fila na mesma tela.
2. WHEN há N mensagens da outra parte ainda não lidas pelo viewer THEN o card SHALL mostrar a contagem N.
3. WHEN o viewer abre o modal de andamento daquela reserva THEN o sistema SHALL marcar as mensagens como lidas para aquele usuário e o badge SHALL zerar no próximo list.
4. WHEN o gestor A marca como lido THEN o gestor B do mesmo tenant SHALL continuar vendo o badge se ainda não abriu o card.

**Independent Test**: Listagem com mensagens da outra parte; abrir andamento; relistar; segundo usuário builder ainda vê contagem.

### P1: Fila até proposta (matriz) ⭐ MVP

**User Story**: Como corretor ou gestor, quero que o CTA do card reflita **quem a etapa aguarda**, não se há mensagem nova.

**Why P1**: Matriz A–G do resumo.

**Acceptance Criteria**:

1. WHEN pré-reserva sem mensagens THEN waiting_on SHALL ser `broker`; corretor vê ação de diálogo; construtora vê “Aguardando corretor”.
2. WHEN pré-reserva e última mensagem é do corretor THEN waiting_on SHALL ser `builder`; construtora vê “Responder”; corretor vê “Aguardando construtora”.
3. WHEN pré-reserva e última mensagem é da construtora THEN waiting_on SHALL ser `broker`; corretor vê “Responder”; construtora vê “Aguardando corretor”.
4. WHEN status `proposal_pending` (Emma) THEN waiting_on SHALL ser `builder`; construtora vê “Aguardando você”; corretor vê “Aguardando construtora” — **mesmo que** existam mensagens não lidas (badge à parte).
5. WHEN status `proposal_returned` THEN waiting_on SHALL ser `broker`; corretor vê “Aguardando você”; construtora vê “Aguardando corretor”; coluna permanece Proposta em análise.
6. WHEN proposta é recusada THEN a reserva SHALL ir para Cancelada (já existente).
7. WHEN a coluna é `proposal_review` THEN o CTA de etapa SHALL ser só label de fila — nunca “Responder” de mensagem.

**Independent Test**: Pest da listagem + Vitest de `resolveKanbanCardCta` / board.

### P1: Diálogo só no modal ⭐ MVP

**User Story**: Como usuário do Kanban, quero conversar **somente** no modal de andamento, sem um segundo diálogo flutuante.

**Why P1**: Resumo: remover chat paralelo; menu não pode ficar órfão.

**Acceptance Criteria**:

1. WHEN o usuário está no Kanban de reservas (builder ou broker) THEN SHALL NOT existir dialog separado só de mensagens.
2. WHEN o menu do card oferece conversa THEN SHALL abrir o modal de andamento (que já contém o chat).
3. WHEN o viewer tem a bola na pré-reserva THEN o botão de etapa “Responder” / “Enviar mensagem” SHALL permanecer e abrir o andamento.

**Independent Test**: Vitest das páginas Kanban e do menu.

---

## Edge Cases

- WHEN o viewer nunca abriu o card THEN todas as mensagens da outra parte contam como não lidas.
- WHEN o viewer envia uma mensagem THEN as mensagens anteriores da outra parte SHALL ser consideradas lidas para ele.
- WHEN só existem mensagens do próprio viewer THEN `unread_messages_count` SHALL ser 0.
- WHEN a reserva está `cancelled` ou `sold` THEN o CTA de fila SHALL ser omitido; o badge de não lidas pode continuar até abrir o andamento.
- WHEN `pending_action` seria `reply` fora de pré-reserva THEN a API SHALL NÃO devolver `reply` (mensagem = badge).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| REQ-RKQ-001 | P1: dois sinais | Execute | Verified |
| REQ-RKQ-002 | P1: unread por user + mark on open | Execute | Verified |
| REQ-RKQ-003 | P1: matriz fila até proposta | Execute | Verified |
| REQ-RKQ-004 | P1: proposal_review CTA só fila | Execute | Verified |
| REQ-RKQ-005 | P1: diálogo só no modal Kanban | Execute | Verified |
| REQ-RKQ-006 | P1: recusa → cancelada; devolução → mesma coluna | Execute | Verified |

**Coverage:** 6 total, 0 mapped to tasks until tasks.md

---

## Success Criteria

- [x] Caso Emma: corretor vê “Aguardando construtora”; gestor vê “Aguardando você”; badge só se houver não lidas
- [x] Abrir andamento zera o badge daquele usuário
- [x] Sem `ReservationMessagesDialog` nas páginas Kanban
- [x] Recusa e devolução sem regressão (Pest existente de proposta)
