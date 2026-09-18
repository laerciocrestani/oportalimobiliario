---
feature: reservation-progress-flex
status: done
---

# Tasks — reservation-progress-flex

Backend antes do frontend que consome. Uma entrega = um pacote testável.

## Entrega 1 — Ciclo da pré-reserva (testar agora)

- [x] **T-01** Config `pre_reservation_hold_hours` + `attachClient` grava `expires_at` +48h. Pest: attach client.
- [x] **T-02** `expireDuePreHolds`: sem cliente = delete; com cliente = `cancelled` + unidade `available` + evento `expired`. Pest command.
- [x] **T-03** Deposit proof a partir de `pre_hold` com cliente → `reserved` + TTL nulo. Pest.
- [x] **T-04** Aceite de proposta sem janela de 48h de sinal. Pest.
- [x] **T-05** `ReservationHoldService` + rotas extend/drop + policy + OpenAPI + Pest (happy, 403, 422, tenant).
- [x] **T-06** Timeline actions `submit_deposit_proof` / `extend_hold` / `drop_hold` na pré-reserva com cliente. Pest.
- [x] **T-07** Frontend: labels + dialogs estender/encerrar + deposit na pré-reserva. Vitest.

**Como testar (dev):** criar pré-reserva com cliente → ver prazo 48h no andamento; anexar comprovante (corretor) → unidade reservada; como gestor, estender +48h e forçar queda. Command: `docker compose exec backend php artisan opim:expire-pre-reservations`.

## Entrega 2 — Templates + formalização de proposta

- [x] **T-08** Permissão `proposals.manage` + CRUD templates.
- [x] **T-09** Gerar PDF da proposta; aceite com upload assinado pela construtora.
- [x] **T-10** Devolução única: PDF ambas as partes + sinal opcional.

## Entrega 3 — Contrato + testemunhas + badges

- [x] **T-11** Testemunhas da equipe; assinatura sequencial; invariante de `sold`.
- [x] **T-12** Badge de ação pendente no **card e no menu**.

## Entrega 4 — Kanban + dialog central

- [x] **T-13** Board 7 colunas; drag validado; dialog central no lugar do sheet.
- [x] **T-14** Índices TRACEABILITY, FLOWS, FRONTEND, PERMISSIONS, GLOSSARY.
