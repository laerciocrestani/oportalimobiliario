# Feature: public-portal

## Objetivo

Listagem read-only de empreendimentos publicados com SEO básico e layout de portal moderno.

## Requisitos

- `REQ-PUB-001`: `GET /api/public/buildings` apenas `published=true`
- `REQ-PUB-002`: Sem autenticação
- `REQ-PUB-003`: Frontend `www.localhost` com listagem (`publicApi`)
- `REQ-PUB-004`: Meta tags SEO por building
- `REQ-PUB-005`: Domínio `diadimoveis.com.br` (deploy futuro)
- `REQ-PUB-006`: Listagem inclui `cheapest_unit` (menor preço entre unidades disponíveis)
- `REQ-PUB-007`: Cards usam capa da primeira mídia pública publicada do empreendimento (`sort_order`, depois `id`)
- `REQ-PUB-008`: Layout portal com hero, header sticky, footer e grid responsivo

## Dependências

- buildings
- building-media

## Status

in_progress — REQ-PUB-005 permanece para deploy
