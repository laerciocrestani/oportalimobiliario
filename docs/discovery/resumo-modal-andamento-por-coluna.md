# Resumo do Entendimento — Modal de andamento por coluna do Kanban

> Descoberta Staff+ (modo rápido). Estudo **antes** de implementar.
> Canvas: `canvases/modal-andamento-por-coluna.canvas.tsx`
> **Status: confirmado e em implementação (2026-09-18).** Premissas da execução: chat 40% da largura; vendida ainda envia; cancelada só leitura; arquivos sempre no painel esquerdo; só ação pendente da coluna; pré-reserva avança por CTA overlay ou drag.

## Problema e objetivo

O Kanban já mostra em que estágio a reserva está. O dialog **Andamento da reserva** ainda renderiza a **esteira completa** (Pré-reserva, Diálogo, Proposta, Decisão do gestor, Aguardando sinal, …) e abre o chat **num segundo dialog**. O corretor e o gestor veem ruído de etapas futuras/passadas que a coluna já comunica.

Objetivo: um único dialog cujo **miolo muda com a coluna**; **chat (40%)** e **zona de arquivos/PDFs/contratos** permanecem em todas as colunas.

## Sistema existente

- Board 7 colunas (`ReservationKanbanColumn`) + `ReservationProgressDialog`.
- Chat: `ReservationMessagesDialog` (overlay separado, ação `open_dialogue`).
- Conteúdo: `ReservationTimeline` lista **15 steps** sempre; painéis de ação empilhados no topo (proposta, sinal, contrato).
- `ReservationSituation` (chevron) já não entra no Kanban; a repetição está **dentro** do dialog.
- Arquivos já vêm em `timeline.attachments`; hoje só aparecem se `length > 0`.

O que **não muda** neste recorte: máquina de estados, `PATCH .../kanban`, permissões, APIs de mensagem/anexo.

## Atores

- **Corretor**: dono da reserva; conversa e executa só as ações da coluna atual.
- **Gestor** (`reservations.cancel`): decide, valida, emite, marca vendida — só o pertinente da coluna.
- **Testemunha**: só o passo de assinatura na coluna Contrato.

## Requisitos funcionais

1. Dialog único ao clicar no card; layout **60% painel da coluna / 40% chat embutido**.
2. **Não** repetir a esteira de etapas (nem chevron, nem 15 steps).
3. Painel esquerdo = **somente o pertinente à coluna** em que o card está.
4. **Chat e zona de arquivos** sempre visíveis, em qualquer coluna (lista vazia se ainda não houver anexo).
5. Cancelada: chat **somente leitura**; demais colunas: chat ativo (vendida a confirmar).

## Regras de negócio (mapa por coluna)

| Coluna | Status de origem | Entra no modal | Não entra |
|--------|------------------|----------------|-----------|
| Pré-reserva/Diálogo | `pre_hold` | Unidade/cliente, prazo 48h, chat, arquivos, hold (gestor) | Proposta, sinal, docs, contrato, timeline |
| Proposta em análise | `proposal_pending`, `proposal_returned` | Dados da proposta, decisão/reenvio, PDFs da proposta | Sinal, docs de contrato, assinaturas, hold, timeline |
| Proposta aceita/Formalização | `deposit_pending` + PDF construtora sem PDF das duas partes | Resumo do aceite, devolver PDF assinado por ambos | Redecidir proposta, emitir contrato, timeline |
| Documentação & Sinal | `deposit_proof_pending`, `contract_data_pending`, `deposit_pending` sem formalizar | Só o subestado pendente: comprovante e/ou dados+docs | Decisão de proposta, assinaturas de contrato, timeline |
| Contrato (assinaturas) | `contract_issued`, `contract_uploaded`, `contract_builder_signed` | Só o passo atual de emissão/assinatura/venda | Formulário de proposta/sinal/cadastro, timeline |
| Vendida | `sold` | Confirmação + dossiê | CTAs de avanço, timeline |
| Cancelada | `cancelled` | Motivo + dossiê; chat leitura | Qualquer mutação, timeline |

**Permanente em todas:** chat 40% + zona de arquivos/PDFs/contratos + cabeçalho (unidade, cliente). Sem esteira.

**Subestados:** em Documentação & Sinal e Contrato, mostrar **apenas a ação pendente**, não todos os formulários da coluna de uma vez.

## Fluxos principais

1. Clique no card → dialog com shell (chat + arquivos) + painel da `kanban_column` atual.
2. Drag para outra coluna que exige upload/form → 422 `action_required` (já existe) → o mesmo dialog abre no painel da **coluna de destino pretendida** (premissa; ver lacunas).
3. Envio de mensagem e download de anexo não dependem da coluna.

## Restrições e premissas

- **PREMISSA:** 40% = fração da **largura** do dialog para o chat, altura total.
- **PREMISSA:** zona de arquivos no painel esquerdo (abaixo do conteúdo da coluna), não uma terceira coluna.
- **PREMISSA:** recorte só frontend do dialog; backend de timeline/kanban permanece.
- **PREMISSA:** avançar da pré-reserva (proposta/sinal) não embute esses formulários **na coluna pré-reserva**; o formulário aparece quando a reserva entra (ou tenta entrar) na coluna correspondente.

## Riscos identificados

- **Pré-reserva sem CTA de proposta:** se o formulário some desta coluna, o corretor precisa de drag ou de um botão que **não** despeje o form no mesmo miolo. Sem isso, trava o avanço.
- **Coluna Documentação & Sinal é catch-all** de 3 status: filtrar mal mistura comprovante com cadastro de contrato.
- Chat embutido aumenta o dialog (`max-w-5xl` hoje pode ficar estreito para 40% úteis).

## Lacunas / decisões pendentes

Ver Rodada 1 no chat. Sem essas respostas o estudo não vira spec.

---
**Aguardando sua confirmação antes de iniciar spec, design ou implementação.**
