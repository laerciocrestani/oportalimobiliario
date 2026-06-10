# Feature: reservations

## Objetivo

Reservas soft com TTL configurável (default 48h).

## Requisitos

- `REQ-RES-001`: Criar reservation temporária em unit `available` (`POST /api/broker/reservations`)
- `REQ-RES-002`: Expiração automática via command `opim:expire-reservations`
- `REQ-RES-003`: TTL configurável em `config/opim.php`
- `REQ-RES-004`: `ReservationSeeder` + testes de expiração

## Dependências

- buildings, auth

## Status

done — command `opim:expire-reservations` + API broker + frontend (`brokerApi`)
