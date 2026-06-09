# Feature: corretor-convites

## Objetivo

Convites de construtoras para corretores e acessos cross-tenant via `acessos_unidades`.

## Requisitos (rascunho)

- `REQ-CONV-001`: Construtora gera link/convite para corretor
- `REQ-CONV-002`: Corretor aceita convite e ganha acesso ao tenant
- `REQ-CONV-003`: Tabela `acessos_unidades` liga corretor + unidade + tenant
- `REQ-CONV-004`: Rotas corretor sem global scope, filtro por acessos
- `REQ-CONV-005`: ConviteCorretorSeeder + AcessoUnidadeSeeder

## Dependências

- empreendimentos, auth, tenancy
