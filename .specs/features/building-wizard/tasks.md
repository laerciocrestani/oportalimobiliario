---
feature: building-wizard
status: in_progress
---

# Tasks — building-wizard

Ordem: backend (schema → serviços → API) antes do frontend que consome. 1 commit atômico por task.

## Backend — fundação

- [x] **T-01** Migration `incc_indices` + model/factory/seeder + Pest isolamento admin.
  - Gate: `php artisan test --compact --filter=Incc`
- [x] **T-02** Command `opim:fetch-incc` + schedule `08:05` `America/Sao_Paulo` + insert-only + teste com HTTP fake.
  - Gate: job não duplica competência; falha de API não quebra.
- [x] **T-03** CRUD admin INCC + `GET hint` + OpenAPI.
  - Gate: `php artisan test --compact --filter=Incc`
- [x] **T-04** `amenities` + pivôs + CRUD admin + `GET /builder/amenities`.
  - Gate: `php artisan test --compact --filter=Amenity`
- [x] **T-05** Migrations building endereço/defaults/wizard; tower `floors_count`; tabela `floors`; colunas de `units` (preço-base, ficha, `floor_id`). `frozen_price_brl` veio de builder-contracts — não duplicar. Backfill `floors` a partir de `units.floor`.
  - Gate: `php artisan test --compact --filter=BuildingTest`; `UnitFloorBackfillTest`
- [x] **T-06** `UnitPriceCalculator` + serialização de `price` calculado nas APIs builder/broker/public. Testes: sobe, desce, sem índice, `frozen_price_brl`.
  - Gate: `php artisan test --compact --filter=UnitPriceCalculator`; `BuildingPriceCalculationTest`

## Backend — wizard

- [x] **T-07** POST/PATCH building com endereço; `GET /builder/cep/{cep}` (Http::fake ViaCEP).
- [x] **T-08** `PUT .../structure` (torres + andares) só rascunho; 409 se publicado.
  - Gate: `php artisan test --compact --filter=BuildingStructure`
- [x] **T-09** `PUT .../unit-grid` (planta típica, exceção redesenha andar, códigos `101…`); 422 andar com 0 unidades.
  - Gate: `php artisan test --compact --filter=BuildingUnitGrid`
- [x] **T-10** Defaults + pivôs de adicionais; DTO une adicionais do prédio + unidade (unidade não remove o do prédio).
  - Gate: `php artisan test --compact --filter=BuildingAmenity`
- [x] **T-11** `POST .../generate-description` (provider env, fake HTTP); PATCH `published` bloqueia sem preço.
  - Gate: `php artisan test --compact --filter=GenerateDescription`; publish sem preço 422.
- [ ] **T-12** OpenAPI completo dos endpoints novos/alterados.

## Frontend — construtora

- [x] **T-13** Rotas wizard + persistência por step + “Continuar cadastro” na listagem.
- [x] **T-14** Step 1 (CEP + endereço) + Vitest.
- [x] **T-15** Step 2 + `BuildingMassing` CSS clicável + Vitest de interação.
- [x] **T-16** Step 3 (grade, exceção, ficha, herança, adicionais).
  - Gate: `pnpm test` `BuildingWizardPage.test.tsx`; ficha e adicionais persistem no unit-grid + PATCH building.
- [x] **T-17** Step 4 (mídia interna/externa, descritivo, IA, switch rascunho).

## Frontend — admin + consumo

- [x] **T-18** Admin: INCC (tabela, editar, hint) e adicionais.
  - Gate: `pnpm test` `InccIndicesPage.test.tsx` `AmenitiesPage.test.tsx`
- [x] **T-19** Broker/público: preço calculado; campos novos no detalhe (subconjunto útil).
  - Gate: `pnpm test` `unit-listing.test.ts` `BrokerUnitsDialog.test.tsx` `BuildingCard.test.tsx` `PublicUnitList.test.tsx`; Pest `BuildingPriceCalculationTest.php`

## Encerramento

- [ ] **T-20** Seeds demo (INCC, amenities, um building via estrutura) + TRACEABILITY + STATE.
