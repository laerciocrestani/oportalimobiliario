# Feature: admin-tenants

## Objetivo

Gestão de construtoras (tenants) pelo admin SaaS.

## Requisitos

- `REQ-ADM-001`: Listar tenants com paginação
- `REQ-ADM-002`: Criar/editar/desativar tenant
- `REQ-ADM-003`: Apenas role admin
- `REQ-ADM-004`: Admin UI + Feature tests
- `REQ-ADM-005`: Admin edita name/slug/active via UI
- `REQ-ADM-006`: Admin impersonate builder escolhendo usuário da equipe

## Dependências

- tenancy, auth

## Status

done — API admin + AdminHome + edição + impersonation
