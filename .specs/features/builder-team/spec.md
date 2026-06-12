# Feature: builder-team

## Objetivo

Gestão de equipe interna da construtora com permissions granulares por usuário.

## Requisitos

- `REQ-TEAM-001`: Catálogo de permissions builder (`buildings.view` … `team.manage`)
- `REQ-TEAM-002`: Spatie teams com `tenant_id` em runtime (`SetPermissionsTeamId`)
- `REQ-TEAM-003`: CRUD `/api/builder/team` (criação direta, permissions por checkbox)
- `REQ-TEAM-004`: Builder cancela reserva via `DELETE /api/builder/reservations/{id}`
- `REQ-TEAM-005`: Policies + `authorize()` em rotas builder; `/me` retorna `permissions[]`
- `REQ-TEAM-006`: UI `/team` com gestão de membros e permissions

## Permissions

| Permission | Uso |
|------------|-----|
| `buildings.view` | Listar/ver empreendimentos, torres, unidades |
| `buildings.manage` | CRUD empreendimentos e torres |
| `units.manage` | CRUD unidades |
| `units.update_status` | Alterar status de unidades |
| `invites.send` | Convites a corretores |
| `access.manage` | Acesso de corretores a unidades |
| `reservations.cancel` | Cancelar reservas no contexto builder |
| `team.manage` | Gerenciar equipe |

## Dependências

- auth, tenancy, buildings

## Status

done
