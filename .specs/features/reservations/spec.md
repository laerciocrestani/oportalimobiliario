# Feature: reservations

## Objetivo

Reservas soft com TTL configurável (default 48h).

## Requisitos

- `REQ-RES-001`: Criar reservation temporária em unit `available` (`POST /api/broker/reservations`)
- `REQ-RES-002`: Expiração automática via command `opim:expire-reservations`
- `REQ-RES-003`: TTL configurável em `config/opim.php`
- `REQ-RES-004`: `ReservationSeeder` + testes de expiração
- `REQ-RES-005`..`009`: pré-reserva e concorrência — ver [reservation-pre-hold/spec.md](../reservation-pre-hold/spec.md)

## Dependências

- buildings, auth

## Status

done — inclui pré-reserva v2 (pre-hold + confirm + polling)
