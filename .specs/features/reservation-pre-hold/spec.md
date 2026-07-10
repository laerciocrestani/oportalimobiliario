---
branch: main
status: done
depends_on: reservations
---

# Feature: reservation-pre-hold

## Objetivo

Controle de concorrência na reserva: pré-reserva temporária (10 min) antes de confirmar com cliente.

## Requisitos

- `REQ-RES-005`: POST `/api/broker/reservations/pre-hold` bloqueia unidade (`pre_reserved`) com TTL 10 min
- `REQ-RES-006`: PATCH `/api/broker/reservations/{id}/confirm` confirma com `client_id` + `observations?` → `reserved` (TTL 48h)
- `REQ-RES-007`: DELETE `/api/broker/reservations/{id}/pre-hold` libera hold ao cancelar dialog
- `REQ-RES-008`: Command `opim:expire-pre-reservations` (schedule every minute)
- `REQ-RES-009`: FE polling 5s com toast anti-spam em transição `available` → `pre_reserved` (outro corretor)

## Status

done
