# Glossary — code (EN) vs UI (pt-BR)

Code identifiers, database schema, and API contracts use **English**. User-facing labels remain **Portuguese**.

## Domain mapping

| PT (legacy) | EN (code) |
|-------------|-----------|
| empreendimento | `building` |
| adicional | `amenity` |
| unidade | `unit` |
| reserva | `reservation` |
| pré-reserva | `pre_hold` / `pre_reservation` |
| prazo da pré-reserva | `hold` (`expires_at`, `extend_hold`, `drop_hold`) |
| proposta | `proposal` |
| sinal | `deposit` |
| comprovante | `deposit_proof` |
| anexo da proposta | `proposal` (attachment kind) |
| PDF gerado da proposta | `proposal_pdf` |
| proposta assinada pela construtora | `proposal_signed_builder` |
| proposta assinada por ambas as partes | `proposal_signed_both` |
| modelo de proposta | `proposal_template` |
| condições de pagamento | `payment_terms` |
| valor do terreno | `land_value` |
| emissão de contrato | `contract_issue` |
| modelo de contrato | `contract_template` |
| preço congelado | `frozen_price_brl` |
| contrato assinado | `contract_signed` |
| contrato assinado pela construtora | `contract_signed_builder` |
| testemunha da reserva | `reservation_witness` / `reservation_witnesses` |
| testemunha 1 / 2 | `slot` 1 / 2 |
| registrar assinatura da testemunha | `sign_as_witness` |
| ação pendente (in-app) | `pending_action` / `pending-actions-count` |
| coluna do Kanban | `kanban_column` / `allowed_kanban_moves` |
| Pré-reserva/Diálogo | `pre_reservation` |
| Proposta em análise | `proposal_review` |
| Proposta aceita/Formalização | `proposal_formalization` |
| Documentação & Sinal | `docs_deposit` |
| Contrato (assinaturas) | `contract` |
| Vendida (coluna Kanban) | `sold` |
| Cancelada (coluna Kanban) | `cancelled` |
| convite corretor | `broker_invite` |
| acesso unidade | `unit_access` |
| role construtora | `builder` |
| role corretor | `broker` |
| profile público | `public` |
| atividade (log da pessoa) | `user_activity_events` / `UserActivityAction` |
| auditar equipe | `audit.view` |

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
| preco congelado | `frozen_price_brl` |
| preco-base | `price_base` |
| area privativa | `private_area_m2` |
| posicao solar | `solar_position` |
| corretor_id | `broker_id` |
| empreendimento_id | `building_id` |
| unidade_id | `unit_id` |
| unidades_count | `units_count` |
| INCC-M | `incc_indices` / `InccIndex` |
| competência INCC | `competence` (1º do mês) |

## Status values

| PT | EN |
|----|-----|
| disponivel | `available` |
| pre_reservada | `pre_reserved` |
| reservada | `reserved` |
| vendida | `sold` |
| pre_hold | `pre_hold` |
| proposta_pendente | `proposal_pending` |
| proposta_devolvida | `proposal_returned` |
| aguardando_sinal | `deposit_pending` |
| comprovante_pendente | `deposit_proof_pending` |
| aguardando_dados_contrato | `contract_data_pending` |
| contrato_emitido | `contract_issued` |
| contrato_enviado | `contract_uploaded` |
| contrato_assinado_construtora | `contract_builder_signed` |
| testemunha_1 / testemunha_2 | `contract_witness_1` / `contract_witness_2` |

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
