---
branch: feature/reservation-garage-spots
status: done
depends_on: reservations, reservation-pre-hold, building-wizard-redesign
---

# Feature: reservation-garage-spots

## Objetivo

Atrelar 0..N vagas de garagem à reserva de uma unidade residencial/comercial. Vagas não têm pré-reserva própria.

## Requisitos

- `REQ-RGS-001`: Pivô `reservation_garage_units` (reservation ↔ unit vaga); `unit_id` unique; `Unit::isGarage()` via `floor.kind=garage`
- `REQ-RGS-002`: `POST /api/broker/reservations/pre-hold` e `POST /reservations` aceitam `garage_unit_ids` opcional (0..N); unidade principal não pode ser vaga
- `REQ-RGS-003`: Validação: mesmo `building_id`, vaga `available`, `isGarage()`, lock atômico; 422 em conflito
- `REQ-RGS-004`: Cascata de status das vagas junto com a unidade principal (pre_reserved → reserved → sold / available); pivô limpo em cancel/expire/release
- `REQ-RGS-005`: Seeds: subsolo garage + 2 vagas (`S1-01`/`S1-02`) por torre nos empreendimentos legado; ReservationSeeder atrela 1 vaga; caso Bosque
- `REQ-RGS-006`: FE corretor: picker 0..N vagas no pre-hold; sem Pré-reservar em vaga; exibir vagas na reserva; Vitest

## Fora de escopo

- Trocar vagas após o pre-hold (PATCH)
- Reserva avulsa de vaga
- Alterar `units_summary` do builder

## Status

in_progress
