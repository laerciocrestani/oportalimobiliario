# Feature: broker-invites

## Objetivo

Convites de construtoras para corretores, vínculo cross-tenant e liberação de acesso por empreendimento.

## Requisitos

- `REQ-CONV-001`: Builder gera convite para broker (`POST /api/builder/invites`)
- `REQ-CONV-002`: Broker aceita convite (`POST /api/broker/invites/accept`)
- `REQ-CONV-003`: Tabela `unit_access` liga broker + unit + tenant (legado; mantida para compatibilidade)
- `REQ-CONV-004`: Rotas broker sem global scope, filtro por `building_access` + `unit_access` legado
- `REQ-CONV-005`: `BrokerInviteSeeder` + `UnitAccessSeeder` + `BuildingAccessSeeder`
- `REQ-CONV-006`: `broker_tenants` criado no aceite do convite
- `REQ-CONV-007`: `building_access` por empreendimento; liberar building = todas as unidades
- `REQ-CONV-008`: Aceite público cria conta corretor (nome + senha) e autentica
- `REQ-CONV-009`: E-mail automático + `invite_url` no create/resend
- `REQ-CONV-010`: UI `/invites` construtora (lista, status, reenvio, gestão de acesso)
- `REQ-CONV-011`: UI `/invite/:token` corretor (preview + registro)

## Dependências

- buildings, auth, tenancy, builder-team (permissions `invites.send`, `access.manage`)

## Status

done — backend + frontend v2
