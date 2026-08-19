---
branch: main
status: done
depends_on: reservation-timeline, builder-team, buildings
source: docs/discovery/resumo-gerenciador-contratos.md
---

# Feature: gerenciador de contratos da construtora

## Objetivo

A construtora cadastra **modelos de contrato** (Markdown + variáveis) no tenant e, na reserva, **emite um PDF** a partir de um modelo ativo. O corretor só lê/baixa o PDF. O valor final em R$ congela na unidade.

## Requisitos

- `REQ-CTR-001`: Menu **Contratos** no portal construtora; visível com `contracts.manage`.
- `REQ-CTR-002`: Permissão `contracts.manage` (CRUD de modelos). Emitir usa `reservations.cancel`.
- `REQ-CTR-003`: CRUD `/api/builder/contract-templates` isolado por `tenant_id` (nome, corpo Markdown, variáveis custom, `is_active`).
- `REQ-CTR-004`: Editor rico (negrito, listas, títulos) persistindo Markdown; legenda insere `{{chave}}` da lista fechada + custom.
- `REQ-CTR-005`: Catálogo fechado de variáveis do sistema (`GET /api/builder/contract-variables`).
- `REQ-CTR-006`: Variáveis custom no modelo (`slug` + `label`); na emissão são obrigatórias se usadas no corpo (inclui typo/`{{desconhecido}}`).
- `REQ-CTR-007`: Modelo inativo some da lista do dialog emitir; permanece no CRUD para reativar.
- `REQ-CTR-008`: `POST /api/builder/reservations/{id}/contract/issue` — escolhe modelo ativo, recebe valores (sistema editáveis + custom) + `final_price_brl`, gera PDF, grava attachment `contract_pdf`, evento `contract_issued`, status `contract_issued`.
- `REQ-CTR-009`: Reemissão permitida até existir `contract_signed` / evento GOV; substitui o PDF anterior e gera novo evento `contract_issued`.
- `REQ-CTR-010`: Na emissão, `units.frozen_price_brl` recebe o R$ final; `{{preco_final}}` usa esse valor.
- `REQ-CTR-011`: Corretor vê/baixa o PDF emitido (somente leitura) no andamento; não edita modelo nem valores.
- `REQ-CTR-012`: PDF sem URL pública; download autenticado (attachment já existente).
- `REQ-CTR-013`: Feature tests Pest + OpenAPI + Vitest (CRUD modelos, dialog emitir, timeline). Seed de um modelo demo.

## Fora desta fatia

- Assinatura GOV, upload do contrato assinado, validar venda (`sold`) — cobertos em `reservation-timeline` Fase D.
- Envio por e-mail/WhatsApp.
- Editar o texto completo no dialog de emitir (só no catálogo).
- Vários modelos emitidos em paralelo na mesma reserva.

## Dependências

- reservation-timeline (Fase C: dados do contrato já existem; emitir era Planned)
- builder-team (permissions)
- buildings / units (`frozen_price_brl`)
