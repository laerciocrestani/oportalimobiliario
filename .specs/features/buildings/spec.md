---
branch: main
status: done
depends_on: tenancy, auth
---

# Feature: buildings

## Objetivo

CRUD de empreendimentos e unidades para perfil construtora, com isolamento por tenant.

## Requisitos

- `REQ-EMP-001`: CRUD `buildings` scoped por tenant (`/api/builder/buildings`)
- `REQ-EMP-002`: CRUD `units` vinculadas a building (`/api/builder/buildings/{building}/units`)
- `REQ-EMP-003`: Status unit: `available`, `reserved`, `sold` (`UnitStatus`)
- `REQ-EMP-004`: Flag `published` para portal público
- `REQ-EMP-005`: Feature tests + `BuildingSeeder` + `UnitSeeder`

## Dependências

- tenancy, auth

## Status

done — backend + frontend construtora (`builderApi`)
