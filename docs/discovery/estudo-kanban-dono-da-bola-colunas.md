# Estudo — Kanban: dono da bola nas colunas pós-proposta

> Status: **confirmado** — spec em `.specs/features/reservation-kanban-post-proposal/`.
> Branch: `docs/kanban-dono-da-bola-colunas`
> Precedente: [resumo-kanban-fila-e-mensagens.md](./resumo-kanban-fila-e-mensagens.md)
> Resumo para confirmar: [resumo-kanban-dono-da-bola-colunas.md](./resumo-kanban-dono-da-bola-colunas.md)

## Objetivo deste estudo

Repetir o mapa **dono da bola × mensagem** para as colunas que ficaram de fora do recorte anterior:

- Proposta aceita/Formalização
- Documentação & Sinal
- Contrato (assinaturas)
- Vendida
- Cancelada (pós-aceite / demais motivos)

O recorte **não** reabre a matriz A–G até Proposta.

## Herdado do mapa até Proposta (não rediscutir)

| Decisão | Valor |
|---------|--------|
| Dois sinais independentes | **Mensagem** = badge de não lidas; **bola** = fila da etapa |
| Leitura | Por usuário autenticado; abrir o modal de andamento marca lido |
| Chat | Somente no modal do card |
| Pré-reserva | Bola segue última mensagem entre papéis |
| Proposta em análise | Bola segue a etapa, independente de mensagens |
| Recusa de proposta | Coluna Cancelada; sem bola |
| Devolução de proposta | Permanece em Proposta em análise; bola no corretor |

## Colunas deste mapa

| # | Coluna (UI) | `kanban_column` | Origem atual no código |
|---|----------------|-----------------|------------------------|
| H+ | Proposta aceita/Formalização | `proposal_formalization` | `deposit_pending` + PDF construtora, sem PDF das duas partes |
| I+ | Documentação & Sinal | `docs_deposit` | `deposit_pending` / `deposit_proof_pending` / `contract_data_pending` (demais) |
| J+ | Contrato (assinaturas) | `contract` | `contract_issued` / `contract_uploaded` / `contract_builder_signed` |
| K | Vendida | `sold` | `sold` |
| L | Cancelada | `cancelled` | `cancelled` (já coberto para recusa de proposta) |

## Como está hoje (hipótese a validar — não é regra fechada)

`waiting_on` no código só admite `broker` | `builder` | `null`. Testemunha **não** é valor de fila.

| Momento | Coluna | `waiting_on` atual | Ação típica (`pending_action`) |
|---------|--------|--------------------|--------------------------------|
| Aceite com PDF da construtora, falta devolver assinado | Formalização | `broker` (`deposit_window`) | `return_signed_proposal` |
| Janela de sinal / anexar comprovante | Docs & Sinal | `broker` | `submit_deposit_proof` |
| Comprovante enviado, aguardando análise | Docs & Sinal | `builder` | `deposit_proof_approval` |
| Dados/docs para contrato | Docs & Sinal | `broker` | `submit_contract_data` |
| Emitir contrato | Docs & Sinal (hoje o código trata como etapa `contract_issue`) | `builder` | (issue) |
| Registrar GOV | Contrato | `broker` | `mark_signed_gov` |
| Enviar PDF do comprador | Contrato | `broker` | `upload_signed_contract` |
| PDF construtora + escolher testemunhas | Contrato | `builder` | `builder_contract_sign` |
| Assinatura testemunha 1 / 2 | Contrato | `builder` (genérico) | `witness_signature` (só o user testemunha) |
| Validar venda | Contrato | `builder` | `sold_validation` |
| Vendida / Cancelada | — | `null` | card sem CTA de fila |

CTA no card hoje: a partir de Proposta, o label da vez do viewer é **“Aguardando você”**; o verbo da ação (`Analisar`, `Assinar`, `Anexar`…) fica no hint, não no label. Vendida/Cancelada não mostram fila.

## Matriz H–S (fechada no resumo)

| # | Momento | Coluna | Bola | Quem tem a bola vê | Outro lado vê |
|---|---------|--------|------|--------------------|---------------|
| H | Falta PDF assinado por ambos | Formalização | Corretor | Devolver | Aguardando corretor |
| I | Aguardando comprovante | Docs & Sinal | Corretor | Anexar | Aguardando corretor |
| I2 | Sinal em atraso | Docs & Sinal | Corretor | Anexar (+ alerta) | Aguardando corretor (+ alerta) |
| J | Análise do comprovante | Docs & Sinal | Construtora | Analisar | Aguardando construtora |
| K | Dados + docs do cliente | Docs & Sinal | Corretor | Enviar dados | Aguardando corretor |
| L | Emitir contrato | **Docs & Sinal** | Construtora | Emitir | Aguardando construtora |
| M | Registrar GOV | Contrato | Corretor | Registrar | Aguardando corretor |
| N | PDF do comprador | Contrato | Corretor | Enviar | Aguardando corretor |
| O | Construtora assina + testemunhas | Contrato | Construtora | Assinar | Aguardando construtora |
| P | Testemunha 1 / 2 | Contrato | Testemunha da vez | Assinar | Aguardando testemunha |
| Q | Validar venda | Contrato | Construtora | Validar | Aguardando construtora |
| R | Vendida | Vendida | — | — | badge se houver msg |
| S | Cancelada | Cancelada | — | — | badge; chat leitura |

## Atores neste recorte

- **Corretor** — dono da reserva
- **Gestor** (`reservations.cancel`) — construtora
- **Testemunha** — user builder atribuído à reserva; **fora** do mapa até Proposta; entra aqui
- Demais papéis builder (sem gestor e sem testemunha): **PREMISSA** — não recebem CTA de bola

## Fora deste estudo

- Implementação, spec, design técnico
- Reabrir matriz A–G (pré-reserva / proposta)
- Visual exato do badge (já lacuna aceita no mapa anterior)
- Contador global do menu Reservas (lacuna aceita no mapa anterior)

## Decisões da Rodada 1 (chat)

| Tema | Decisão |
|------|---------|
| CTA da etapa (pós-proposta) | **Verbo da etapa** quando a bola é do viewer (`Anexar`, `Analisar`, `Assinar`, `Validar`…). O outro lado vê “Aguardando X”. |
| Testemunha 1 / 2 | Bola da **testemunha da vez**. Gestor e corretor veem “Aguardando testemunha”; a testemunha vê a vez dela. |
| Sinal em atraso | Bola **permanece no corretor**. Os dois veem alerta de atraso; a fila **não** passa para a construtora. |

Contraste com o mapa até Proposta: em Proposta em análise o label da vez era “Aguardando você”, sem misturar “Responder”. Da Formalização em diante o label da vez **é o verbo**.

## Decisões da Rodada 2 (chat)

| Tema | Decisão |
|------|---------|
| Formalização | Bola **sempre no corretor** (devolver PDF assinado). Construtora vê “Aguardando corretor”. |
| Docs & Sinal | **Sequencial, um dono por card:** anexar comprovante → construtora analisa → corretor envia dados/docs. |
| Vendida / Cancelada | **Sem CTA de fila.** Badge de mensagem se houver não lidas. Cancelada: chat só leitura (já definido). |

## Decisões da Rodada 3 (chat)

| Tema | Decisão |
|------|---------|
| Porta de Formalização | Card **só sai** depois do PDF assinado por ambos. Sem anexar sinal nessa coluna. |
| Emitir contrato | Permanece em **Documentação & Sinal**. Construtora vê `Emitir`. |
| CTA da testemunha | Ela vê `Assinar`; os outros veem “Aguardando testemunha”. |
