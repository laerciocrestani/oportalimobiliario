# Feature: reservas

## Objetivo

Reservas soft com TTL configurável (default 48h).

## Requisitos

- `REQ-RES-001`: Criar reserva temporária em unidade disponível
- `REQ-RES-002`: Expiração automática via job/command
- `REQ-RES-003`: TTL configurável em `config/opim.php`
- `REQ-RES-004`: ReservaSeeder + testes de expiração

## Dependências

- empreendimentos, auth

## Status

done — command `opim:expire-reservas` + API corretor + frontend
