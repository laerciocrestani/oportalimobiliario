---
branch: feature/reservation-progress-flex
status: done
depends_on: reservation-timeline, builder-contracts, builder-team
source: docs/discovery/resumo-andamento-reserva-flexivel.md
---

# Feature: andamento flexível da reserva

## Objetivo

Substituir a timeline **linear e travada** por um **andamento guiado**: etapas iniciais opcionais/reordenáveis; fase de contrato sequencial; sinal e proposta assinada opcionais; Kanban + dialog central; templates de proposta; testemunhas da equipe.

Entregas fatiadas para teste incremental (ver [tasks.md](./tasks.md)).

## Atores

| Ator | Portal | Papel |
|------|--------|-------|
| Corretor | `corretor` | Dono da reserva |
| Gestor | `construtora` | `reservations.cancel` |
| Testemunha | `construtora` | Membro da equipe, escolhida por reserva (Entrega 3) |

## Entregas

| # | Nome | Testável quando |
|---|------|-----------------|
| **1** | Ciclo da pré-reserva (48h, sinal, hold, gestor) | API + andamento atual (sheet) |
| **2** | Templates + formalização de proposta | CRUD Propostas + aceite com PDF |
| **3** | Contrato + testemunhas + avisos in-app | Assinaturas sequenciais + badges |
| **4** | Kanban + dialog central | Board 7 colunas + drag validado |

## Requisitos — Entrega 1

- `REQ-RPF-001`: Pré-hold **sem cliente** permanece com TTL de **10 min** (hard delete ao expirar).
- `REQ-RPF-002`: Ao **vincular cliente**, inicia janela de **48h** (`expires_at`). Unidade segue `pre_reserved`.
- `REQ-RPF-003`: Sem sinal, sem avanço e sem extensão em 48h → sistema **derruba automaticamente**: unidade `available`, reserva `cancelled`, evento `expired` (preserva histórico). Sem ação do gestor.
- `REQ-RPF-004`: **Lançar sinal** (comprovante) a partir da pré-reserva com cliente promove unidade para `reserved`, zera `expires_at`, status `deposit_proof_pending`.
- `REQ-RPF-005`: **Avançar** (enviar proposta) segura a reserva: zera `expires_at` (já existente). Unidade permanece `pre_reserved` até aceite ou sinal.
- `REQ-RPF-006`: Gestor **estende** o prazo (soma horas ao `expires_at` vigente; default +48h), quantas vezes quiser, só em pré-reserva com cliente.
- `REQ-RPF-007`: Gestor **força a queda** da pré-reserva (unidade disponível, reserva cancelada) antes do fim do prazo.
- `REQ-RPF-008`: Aceite da proposta **não** abre mais janela de 48h de sinal. Promove unidade a `reserved`. Sinal segue opcional depois.
- `REQ-RPF-009`: Timeline da pré-reserva com cliente expõe: corretor `submit_deposit_proof` + `submit_proposal`; gestor `extend_hold` + `drop_hold`.

## Requisitos — Entregas 2–4 (planejado)

- `REQ-RPF-010`: CRUD de templates de proposta (`proposals.manage`).
- `REQ-RPF-011`: Geração de PDF da proposta a partir do template; no aceite, gestor envia PDF assinado pela construtora.
- `REQ-RPF-012`: Corretor devolve PDF assinado por ambas as partes + comprovante de sinal (quando houver) em um único envio.
- `REQ-RPF-013`: Contrato sequencial: comprador → construtora → testemunha 1 → testemunha 2 → gestor marca `sold` só com todas as assinaturas.
- `REQ-RPF-014`: Testemunhas = membros da equipe do tenant, escolhidas por reserva.
- `REQ-RPF-015`: Avisos in-app: badge **no card da reserva e no menu** (ambos).
- `REQ-RPF-016`: Kanban 7 colunas; drag-and-drop validado no backend; dialog central substitui o sheet.
- `REQ-RPF-017`: Gestor vê todas as reservas do tenant; corretor só as suas.

## Fora desta feature

- Venda direta pela construtora (vendedor próprio) — fase 2 posterior.
- E-mail / WhatsApp / gov.br.

## Aceite Entrega 1

1. WHEN corretor vincula cliente à pré-reserva THEN `expires_at` SHALL ser now + 48h.
2. WHEN 48h passam sem sinal/proposta/extensão THEN o command SHALL cancelar a reserva (não apagar) e liberar a unidade.
3. WHEN corretor anexa comprovante na pré-reserva THEN unidade SHALL ficar `reserved`.
4. WHEN gestor estende THEN `expires_at` SHALL somar as horas pedidas.
5. WHEN gestor força queda THEN unidade SHALL voltar a `available`.
