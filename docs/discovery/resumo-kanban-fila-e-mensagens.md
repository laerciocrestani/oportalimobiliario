# Resumo do Entendimento — Kanban: dono da bola × mensagens (até Proposta)

## Problema e objetivo

No Kanban de reservas, o card misturava **mensagem nova** com **próxima ação de etapa**. Exemplo: Emma Santana — corretor enviou a proposta, card em “Proposta em análise”; a bola é da construtora, mas corretor e construtora podiam ver “Aguardando você”.

Objetivo: separar dois sinais no card e alinhar a fila de responsabilidade até a fase de proposta (aceite / devolução / recusa). Demais colunas (sinal, contrato, venda) ficam para um mapa seguinte.

## Sistema existente

- Stack: Laravel API + React SPA (broker/builder); Kanban em `ReservationKanbanBoard`.
- Hoje:
  - `situation.waiting_on` (`broker` | `builder`) descreve quem a **etapa** aguarda (`ReservationTimelineService::resolveWaitingOn`).
  - `needs_action` / `pending_action` são **por viewer** (`ReservationPendingReplyService`).
  - `needs_reply` é booleano: última mensagem é do outro papel; some quando o viewer responde — **não** há contagem nem “lido ao abrir o card”.
- Chat flutuante / botão “Conversar” existe; diálogo também no modal de andamento (`ReservationProgressDialog` + `ReservationChatPanel`).
- O que **não** muda neste escopo: colunas após aceite da proposta; regras de anexos/PDF da proposta.

## Restrições organizacionais

- Escopo desta descoberta: **até proposta** (pré-reserva + proposta em análise).
- Próximo mapa: formalização, sinal, contrato, vendida.
- Premissa: implementação só após confirmação explícita deste resumo.

## Atores

- **Corretor:** inicia pré-reserva, diálogo, envia/reenvia proposta; lê mensagens da construtora.
- **Construtora (gestor):** responde diálogo, decide proposta (aceitar / devolver / recusar); lê mensagens do corretor.
- **Testemunhas / demais papéis builder:** fora deste mapa (pós-proposta).

## Requisitos funcionais

1. **Dois sinais independentes no card**
   - **Mensagem:** badge de novas mensagens da outra parte.
   - **Dono da bola:** label/CTA da etapa (“Aguardando você” / “Aguardando corretor” / “Aguardando construtora”).
2. **Badge de mensagem**
   - Conta mensagens da outra parte **ainda não lidas** desde a última marcação de leitura.
   - Ex.: construtora envia 2 → corretor vê `(2)`; corretor abre o card → some; nova mensagem → `(1)`.
   - Abrir o **card** (andamento/modal) já marca como lido — não exige abrir só o chat.
3. **Mensagem + bola ao mesmo tempo:** card pode mostrar badge **e** status de fila na mesma tela.
4. **Pré-reserva — botão de etapa “Responder” / ações de diálogo** permanece nesta coluna quando for a vez do viewer (conforme matriz).
5. **Proposta em análise — CTA de etapa** só labels de fila (“Aguardando você” / “Aguardando X”); **não** misturar com “Responder” de mensagem (mensagem = badge).
6. **Remover chat flutuante** (canto inferior / botão Conversar fora do modal): diálogo fica **somente** dentro do modal/dialog do card.
7. **Proposta recusada** → reserva cancelada (coluna Cancelada).
8. **Proposta devolvida** → permanece em Proposta em análise; bola passa ao corretor (reenviar).

## Requisitos não funcionais

- Contagem de não lidas e marcação de leitura: consistentes por viewer (corretor vs users da construtora no tenant — detalhe de “lido por user” vs “lido por papel” a fechar na implementação; **PREMISSA:** por usuário autenticado).
- Sem regressão no fluxo de proposta já documentado em `.specs/codebase/FLOWS.md` (aceite com PDF, devolução, recusa).

## Regras de negócio

### Mensagens

- Aviso aparece só se houver mensagem **da outra parte** não lida pelo viewer.
- Abrir o card limpa o badge (marca leitura).
- Contagem = quantidade de mensagens não lidas (não só booleano).

### Dono da bola (matriz até proposta)

| # | Momento | Coluna | Bola | Ação de quem tem a bola | Outro lado vê |
|---|---------|--------|------|-------------------------|---------------|
| A | Pré-reserva, sem msg / sem proposta enviada | Pré-reserva/Diálogo | Corretor | Iniciar diálogo / enviar proposta | Aguardando corretor |
| B | Pré-reserva, última msg do corretor | Pré-reserva/Diálogo | Construtora | Responder no diálogo | Aguardando construtora |
| C | Pré-reserva, última msg da construtora | Pré-reserva/Diálogo | Corretor | Responder / enviar proposta | Aguardando corretor |
| D | Proposta enviada (`proposal_pending`) — caso Emma | Proposta em análise | Construtora | Aceitar / recusar / devolver | Aguardando construtora |
| E | Proposta devolvida (`proposal_returned`) | Proposta em análise | Corretor | Reenviar proposta | Aguardando corretor |
| F | Proposta recusada | Cancelada | — | — | — |
| G | Proposta aceita | Fora deste mapa | — | (próximo discovery) | — |

- Em pré-reserva, a bola do **diálogo** segue a **última mensagem** entre papéis (como a ideia atual de `resolveDialogueWaitingOn`).
- Em Proposta em análise, a bola segue a **etapa** (`proposal_decision` → construtora; `proposal_returned` → corretor), **independente** de mensagens.

## Fluxos principais

1. **Emma:** corretor envia proposta → card em Proposta em análise → construtora “Aguardando você”; corretor “Aguardando construtora” (+ badge se houver msgs não lidas).
2. **Devolução:** construtora devolve → mesma coluna → bola corretor → “Aguardando você” no corretor / “Aguardando corretor” na construtora.
3. **Recusa:** construtora recusa → cancelada.
4. **Mensagens em paralelo:** N msgs da construtora → badge (N) no corretor; abrir card → limpa; etapas inalteradas.

## Integrações externas

- Nenhuma nova. Persistência de “última leitura” provavelmente na API (campo/tabela por `reservation_id` + `user_id`).

## Restrições e premissas

- Escopo UI/API limitado a pré-reserva + proposta em análise para **fila**; remoção do chat flutuante pode ser global no Kanban.
- **PREMISSA:** leitura de mensagem é por **usuário** (não compartilhada entre todos os gestores da construtora).
- **PREMISSA:** “abrir o card” = abrir o modal de andamento daquela reserva.
- Mapa pós-aceite: sessão de discovery seguinte.

## Riscos identificados

- **needs_action misturado com reply:** se `pending_action=reply` continuar alimentando o CTA de etapa em Proposta em análise, o bug Emma volta — mitigação: CTA de etapa só por `waiting_on` / etapa; reply só badge.
- **Lido por user vs papel:** gestor A abre e limpa o dele; gestor B ainda vê badge — aceito na premissa; se quiser “lido pelo tenant”, muda o modelo.
- **Remover chat flutuante:** garantir que menu “Responder · nova” / atalhos não fiquem órfãos — diálogo só no modal.

## Lacunas / decisões pendentes

- Detalhe visual exato do badge no card (posição, cor) — UX na implementação.
- Endpoint/evento preciso para `markMessagesRead` (ao `GET timeline` / ao abrir dialog) — design técnico pós-confirmação.
- Contador global do menu “Reservas” (pending-actions vs unread messages) — alinhar se o badge do menu deve somar só etapa, só mensagem, ou ambos (fora do núcleo deste resumo; **lacuna aceita** para a fase de design).

---

**Aguardando sua confirmação antes de iniciar arquitetura ou implementação.**
