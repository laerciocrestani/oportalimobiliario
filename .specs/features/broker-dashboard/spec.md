# Feature: broker-dashboard

## Objetivo

Dashboard do corretor com visão geral (charts mock), empreendimentos com fluxo de reserva, e módulo de clientes vinculados ao corretor.

## Requisitos

- `REQ-BRK-DASH-001`: Nav com Visão geral (`/`), Empreendimentos (`/buildings`), Clientes (`/clients`)
- `REQ-BRK-DASH-002`: Visão geral com KPIs e charts mock (dados ilustrativos)
- `REQ-BRK-DASH-003`: Empreendimentos em cards; dialog de unidades; dialog de reserva com seleção de cliente
- `REQ-BRK-CLI-001`: CRUD mínimo de clientes do corretor (`GET/POST /api/broker/clients`) — nome*, telefone*, email opcional
- `REQ-BRK-CLI-002`: Cadastro inline de cliente durante reserva (dialog aninhado)
- `REQ-BRK-RES-001`: Reserva exige `client_id` do corretor autenticado
- `REQ-BRK-RES-002`: Acesso à unidade via `BuildingAccess` OU `UnitAccess` legado

## Dependências

- auth, broker-invites, buildings, reservations

## Status

done
