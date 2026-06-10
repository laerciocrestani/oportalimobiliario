# Feature: broker-invites

## Objetivo

Convites de construtoras para corretores e acessos cross-tenant via `unit_access`.

## Requisitos

- `REQ-CONV-001`: Builder gera convite para broker (`POST /api/builder/invites`)
- `REQ-CONV-002`: Broker aceita convite (`POST /api/broker/invites/accept`)
- `REQ-CONV-003`: Tabela `unit_access` liga broker + unit + tenant
- `REQ-CONV-004`: Rotas broker sem global scope, filtro por `unit_access`
- `REQ-CONV-005`: `BrokerInviteSeeder` + `UnitAccessSeeder`

## Dependências

- buildings, auth, tenancy

## Status

done — backend + frontend construtora/corretor (`builderApi`, `brokerApi`)
