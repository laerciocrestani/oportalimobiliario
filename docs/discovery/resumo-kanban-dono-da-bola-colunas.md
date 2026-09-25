# Resumo do Entendimento — Kanban: dono da bola (Formalização → Vendida)

> Precedente: [resumo-kanban-fila-e-mensagens.md](./resumo-kanban-fila-e-mensagens.md) (matriz A–G até Proposta).
> Notas de descoberta: [estudo-kanban-dono-da-bola-colunas.md](./estudo-kanban-dono-da-bola-colunas.md)
> Branch: `docs/kanban-dono-da-bola-colunas`

## Problema e objetivo

O mapa de fila até Proposta já separa **mensagem** (badge) de **dono da bola** (etapa). Nas colunas seguintes o card ainda mistura papéis: `waiting_on` só conhece corretor/construtora, então a vez da testemunha aparece como bola da construtora; Formalização e Documentação & Sinal podem coexistir no mesmo card; “Emitir contrato” ocorre com o card ainda em Docs & Sinal.

Objetivo: fechar **quem tem a bola**, **qual CTA o dono vê** e **o que o outro lado lê** da Formalização até Vendida/Cancelada, sem reabrir a matriz A–G.

## Sistema existente

- Stack: Laravel API + React SPA; Kanban em `ReservationKanbanBoard`.
- Fila até proposta já em produção (`situation.waiting_on`, badge `unread_messages_count`, chat só no modal).
- `waiting_on` atual: `broker` | `builder` | `null`. Testemunha não é valor de fila — `pending_action=witness_signature` só para o user testemunha; o gestor pode ver “Aguardando você”.
- Coluna Formalização deriva de anexos (`proposal_signed_builder` sem `proposal_signed_both`). Hoje o corretor **pode** anexar sinal antes de devolver o PDF e o card sai da coluna.
- `contract_data_pending` permanece em Documentação & Sinal até `POST contract/issue`; a coluna Contrato só começa em `contract_issued`.
- O que **não** muda neste recorte: matriz A–G; regras de anexo/PDF da proposta já definidas até o aceite; chat só no modal; leitura de mensagem por usuário.

## Restrições organizacionais

- Escopo desta descoberta: **fila/CTA pós-proposta** (Formalização, Docs & Sinal, Contrato, Vendida, Cancelada).
- Branch só para o estudo; implementação só após confirmação explícita deste resumo.
- Sem prazo/orçamento informados — **PREMISSA:** recorte de produto, sem deadline.

## Atores

- **Corretor:** dono da reserva; devolve PDF assinado; anexa sinal; envia dados/docs; registra GOV; envia PDF do comprador.
- **Construtora (gestor, `reservations.cancel`):** analisa comprovante; emite contrato; assina PDF da construtora e escolhe testemunhas; valida venda.
- **Testemunha:** user builder atribuído à reserva (slot 1 ou 2); assina na vez dela. Fora do mapa A–G; entra aqui.
- **Demais users builder** (nem gestor nem testemunha da reserva): **PREMISSA:** não são dono da bola; não veem CTA de etapa.

## Requisitos funcionais

1. **Dois sinais continuam independentes** em todas as colunas deste mapa (mensagem = badge; bola = CTA de etapa).
2. **CTA da vez (pós-proposta):** verbo da etapa (`Devolver`, `Anexar`, `Analisar`, `Enviar dados`, `Emitir`, `Registrar`, `Enviar`, `Assinar`, `Validar`). **Não** usar “Aguardando você” nestas colunas.
3. **CTA do outro lado:** “Aguardando corretor” | “Aguardando construtora” | “Aguardando testemunha”, sem verbo.
4. **Formalização é porta:** o card só sai de Proposta aceita/Formalização depois do PDF assinado por ambos. **Não** anexar comprovante de sinal nesta coluna.
5. **Docs & Sinal é sequencial, um dono por card:** anexar comprovante → construtora analisa → corretor envia dados/docs → construtora emite contrato (ainda nesta coluna).
6. **Sinal em atraso:** bola permanece no corretor (`Anexar`); os dois veem alerta de atraso; a fila **não** passa para a construtora.
7. **Emitir contrato:** card **permanece** em Documentação & Sinal; construtora vê `Emitir`; corretor vê “Aguardando construtora”. Coluna Contrato começa após o PDF emitido.
8. **Testemunha da vez:** ela vê `Assinar`; corretor e gestor veem “Aguardando testemunha” (não “Aguardando você”).
9. **Vendida e Cancelada:** sem CTA de fila; badge de mensagem se houver não lidas. Cancelada: chat só leitura.

## Requisitos não funcionais

- Mensagens: herda o mapa anterior (contagem por usuário; abrir o andamento marca lido).
- Sem regressão na máquina de estados já documentada em `.specs/codebase/FLOWS.md`, **exceto** a porta de Formalização (hoje o overlap com sinal é possível).
- Fila da testemunha precisa ser distinguível da fila do gestor — senão o bug Emma se repete na coluna Contrato.

## Regras de negócio

### Mensagens (herdado)

- Badge só com não lidas da outra parte; abrir o card limpa; independente da bola.

### Dono da bola (matriz H–S)

| # | Momento | Coluna | Bola | Quem tem a bola vê | Outro lado vê |
|---|---------|--------|------|--------------------|---------------|
| H | Proposta aceita, falta PDF assinado por ambos | Formalização | Corretor | Devolver | Aguardando corretor |
| I | Aguardando comprovante de sinal | Docs & Sinal | Corretor | Anexar | Aguardando corretor |
| I2 | Sinal em atraso, sem comprovante | Docs & Sinal | Corretor | Anexar (+ alerta) | Aguardando corretor (+ alerta) |
| J | Comprovante enviado, análise | Docs & Sinal | Construtora | Analisar | Aguardando construtora |
| K | Dados + docs do cliente | Docs & Sinal | Corretor | Enviar dados | Aguardando corretor |
| L | Emitir contrato PDF | **Docs & Sinal** | Construtora | Emitir | Aguardando construtora |
| M | Registrar assinatura GOV | Contrato | Corretor | Registrar | Aguardando corretor |
| N | Upload PDF do comprador | Contrato | Corretor | Enviar | Aguardando corretor |
| O | Construtora assina + escolhe testemunhas | Contrato | Construtora | Assinar | Aguardando construtora |
| P | Testemunha 1 (depois 2) | Contrato | Testemunha da vez | Assinar | Aguardando testemunha |
| Q | Gestor valida venda | Contrato | Construtora | Validar | Aguardando construtora |
| R | Vendida | Vendida | — | — | — (badge se houver msg) |
| S | Cancelada | Cancelada | — | — | — (badge se houver msg; chat leitura) |

- Em P: após T1 assinar, a bola passa a T2 com os mesmos labels.
- Se o viewer for o gestor **e** a testemunha da vez, vale a vista de testemunha (`Assinar`), não “Aguardando testemunha”.
- Verbos da tabela: **PREMISSA** (reuso dos labels já existentes em `KANBAN_CARD_ACTIONS`, com `Emitir` para a emissão).

## Fluxos principais

1. **Aceite → formalizar:** construtora aceitou com PDF dela → card em Formalização → corretor `Devolver` → só então o card vai para Docs & Sinal.
2. **Sinal no prazo:** corretor `Anexar` → construtora `Analisar` → corretor `Enviar dados` → construtora `Emitir` (ainda em Docs & Sinal) → card entra em Contrato.
3. **Sinal atrasado:** mesmo fluxo de (2); alerta visível para os dois; CTA continua `Anexar` no corretor.
4. **Contrato:** corretor `Registrar` GOV → `Enviar` PDF comprador → construtora `Assinar` + testemunhas → T1 `Assinar` → T2 `Assinar` → construtora `Validar` → Vendida.
5. **Mensagens em paralelo:** badge independente em qualquer coluna deste mapa, inclusive Vendida; Cancelada não envia.

## Integrações externas

- Nenhuma nova. GOV continua registro manual (já definido na timeline).

## Restrições e premissas

- **PREMISSA:** users builder que não são gestor nem testemunha da reserva não recebem CTA de bola.
- **PREMISSA:** verbos da matriz H–S conforme tabela (ajustáveis na confirmação).
- **PREMISSA:** “Aguardando testemunha” não discrimina slot 1 vs 2 no card.
- **PREMISSA:** leitura de mensagem permanece por usuário (mapa anterior).
- Matriz A–G e chat flutuante **não** reabrem.
- Porta de Formalização **é mudança de fluxo**, não só de copy do card.

## Riscos identificados

- **Emma 2.0 (testemunha):** se `waiting_on` continuar só `builder` na vez da testemunha, o gestor vê “Assinar”/“Aguardando você”. Mitigação: bola da testemunha da vez, distinta do gestor.
- **Porta de Formalização:** bloquear comprovante nessa coluna altera API/UI já existentes; sem isso a matriz “um dono / uma ação” não se sustenta.
- **Emitir contrato em Docs & Sinal:** a coluna chama-se Documentação & Sinal, mas o CTA é `Emitir`. Aceito nesta descoberta; risco de confusão de vocabulário na UI.
- **Gestor que também é testemunha:** regra de desempate (vista da vez) precisa de teste dedicado.

## Lacunas / decisões pendentes

- Copy exata se o gestor **não** for a testemunha da vez mas for T2 aguardando T1 — **PREMISSA:** também “Aguardando testemunha”.
- Endpoint/`waiting_on` para o terceiro valor (testemunha) — design técnico pós-confirmação.
- Contador do menu Reservas (etapa vs mensagem vs testemunha) — lacuna já aceita no mapa anterior.
- Visual do alerta de sinal atrasado no card — UX na implementação.

---

**Confirmado.** Spec: `.specs/features/reservation-kanban-post-proposal/spec.md`
