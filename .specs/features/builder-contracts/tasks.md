---
feature: builder-contracts
status: done
---

# Tasks — builder-contracts

Ordem: backend (schema → serviços → API) antes do frontend que consome. 1 commit atômico por task (quando o usuário pedir commit).

## Backend — fundação

- [x] **T-01** Permissão `contracts.manage` em `BuilderPermissions` (constante, `all()`, `labels()`). Pest: aparece no catálogo da equipe.
  - Gate: `php artisan test --compact --filter=TeamTest`
- [x] **T-02** Migration `contract_templates` + model `BelongsToTenant` + factory + `ContractTemplatePolicy`.
  - Gate: factory cria no tenant; global scope isola.
- [x] **T-03** CRUD `ContractTemplateController` + rotas + `GET contract-variables` + OpenAPI + Pest (happy, 403, 422, tenant isolation).
  - Gate: `php artisan test --compact --filter=ContractTemplate`
- [x] **T-04** `ContractSystemVariables` + `ContractVariableResolver` (valores do sistema, extração de `{{slug}}`, unknown placeholders). Unit tests.
  - Gate: `php artisan test --compact --filter=ContractVariable`

## Backend — emissão

- [x] **T-05** Migration `units.frozen_price_brl` + `reservations.contract_template_id` / `contract_values` + status `contract_issued`.
- [x] **T-06** Composer `barryvdh/laravel-dompdf` + `ContractPdfRenderer` (Markdown sanitizado → PDF). Teste com HTML simples (assert PDF header `%PDF`).
- [x] **T-07** `ContractIssueService` + preview/issue endpoints + OpenAPI. Substitui `contract_pdf`, congela preço, evento `contract_issued`. Reemissão até assinado. Timeline: `issue_contract` também em `contract_sign_gov`.
  - Gate: `php artisan test --compact --filter=ContractIssue`
- [x] **T-08** Corretor consegue baixar `contract_pdf` da própria reserva (ajuste de filtro se esconder). Pest broker 200 / outro broker 403.
- [x] **T-09** Seeder de um modelo demo (Alpha) + factory states.

## Frontend — construtora

- [x] **T-10** Permissão + nav **Contratos** + rota `/contracts` + `builderApi` CRUD/preview/issue. Vitest do filtro de nav.
- [x] **T-11** `ContractsPage` + editor Markdown (textarea + inserção de `{{slug}}`; TipTap fica polish) + custom vars. Vitest interação.
- [x] **T-12** `BuilderIssueContractDialog` ligado ao `issue_contract` da timeline (R$ final + values). Vitest. Label Reemitir se já há PDF.

## Encerramento

- [x] **T-13** TRACEABILITY, FRONTEND, PERMISSIONS, GLOSSARY, FLOWS, SEEDS, OpenAPI conferido.
