# Feature: empreendimentos

## Objetivo

CRUD de empreendimentos e unidades para perfil construtora, com isolamento por tenant.

## Requisitos (rascunho)

- `REQ-EMP-001`: CRUD empreendimentos scoped por tenant
- `REQ-EMP-002`: CRUD unidades vinculadas a empreendimento
- `REQ-EMP-003`: Status unidade: disponível, reservada, vendida
- `REQ-EMP-004`: Flag `publicado` para portal público
- `REQ-EMP-005`: Feature tests + EmpreendimentoSeeder + UnidadeSeeder

## Dependências

- tenancy, auth
