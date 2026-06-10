# Glossary — code (EN) vs UI (pt-BR)

Code identifiers, database schema, and API contracts use **English**. User-facing labels remain **Portuguese**.

## Domain mapping

| PT (legacy) | EN (code) |
|-------------|-----------|
| empreendimento | `building` |
| unidade | `unit` |
| reserva | `reservation` |
| convite corretor | `broker_invite` |
| acesso unidade | `unit_access` |
| role construtora | `builder` |
| role corretor | `broker` |
| profile público | `public` |

## Columns

| PT | EN |
|----|-----|
| nome | `name` |
| descricao | `description` |
| cidade | `city` |
| estado | `state` |
| publicado | `published` |
| codigo | `code` |
| andar | `floor` |
| preco | `price` |
| corretor_id | `broker_id` |
| empreendimento_id | `building_id` |
| unidade_id | `unit_id` |
| unidades_count | `units_count` |

## Status values

| PT | EN |
|----|-----|
| disponivel | `available` |
| reservada | `reserved` |
| vendida | `sold` |

## Dev hostnames (unchanged — PT)

| Hostname | Internal profile key |
|----------|---------------------|
| `construtora.localhost` | `builder` |
| `corretor.localhost` | `broker` |
| `www.localhost` | `public` |
| `admin.localhost` | `admin` |

Production DNS may stay PT (`construtora.oportalimobiliario.com.br`); internal roles use `builder` / `broker`.

## API prefixes

| Prefix | Role |
|--------|------|
| `/api/builder/*` | `builder` |
| `/api/broker/*` | `broker` |
| `/api/admin/*` | `admin` |
| `/api/public/buildings` | — (no auth) |
