# Feature: public-portal

## Objetivo

Listagem read-only de empreendimentos publicados com SEO básico.

## Requisitos

- `REQ-PUB-001`: `GET /api/public/buildings` apenas `published=true`
- `REQ-PUB-002`: Sem autenticação
- `REQ-PUB-003`: Frontend `www.localhost` com listagem (`publicApi`)
- `REQ-PUB-004`: Meta tags SEO por building
- `REQ-PUB-005`: Domínio `diadimoveis.com.br` (deploy futuro)

## Dependências

- buildings

## Status

done — REQ-PUB-005 permanece para deploy
