---
branch: docs/kanban-dono-da-bola-colunas
status: done
depends_on: builder-team, reservation-kanban-post-proposal
---

# Feature: reservation-witness-permission

## Problem Statement

Qualquer builder do tenant entra no seletor de testemunhas. Quem gerencia contratos ou cancela reservas não é, por isso, testemunha — e a mesma pessoa pode acumular funções. Falta um checkbox na Equipe para **elegibilidade**, sem portal/role novo.

## Goals

- [x] Permission `reservations.witness` (“Pode ser testemunha”) no catálogo da Equipe
- [x] Seletor e atribuição só com essa permission
- [x] Slot já atribuído continua podendo assinar se a permission for revogada depois
- [x] Combinável com outras permissions (sem perfil exclusivo)

## Out of Scope

| Item | Reason |
|------|--------|
| Role/portal `witness` | Membros acumulam funções; checklist da Equipe já existe |
| `reservations.cancel` / `contracts.manage` implicam testemunha | Funções distintas |
| E-mail / gov.br na assinatura | Já é registro in-app pelo slot |
| Contador do menu Reservas | Lacuna aceita no mapa Kanban |

## Requirements

- `REQ-WIT-001`: Catálogo builder inclui `reservations.witness` / label **Pode ser testemunha** (BE + FE Equipe).
- `REQ-WIT-002`: `GET .../witness-candidates` lista só builders do tenant com essa permission.
- `REQ-WIT-003`: Atribuir testemunha (upload do PDF da construtora ou `PUT .../witnesses`) rejeita 422 se o membro não tiver `reservations.witness`.
- `REQ-WIT-004`: Quem já está no slot assina (`POST .../witnesses/{slot}/sign`) mesmo sem a permission no momento da assinatura. Policy continua por atribuição, não por permission.

## Seeds

- Owner alpha/beta: `BuilderPermissions::all()` (inclui testemunha).
- `supervisor@alpha.demo`: ganha `reservations.witness` (demo gestor + testemunha).
- `comercial@alpha.demo`: sem a permission (não aparece no seletor).
