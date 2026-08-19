---
feature: building-wizard
status: in_progress
---

# Tasks — building-wizard

Ordem: backend (schema → serviços → API) antes do frontend que consome. 1 commit atômico por task.

## Backend — fundação

- [x] **T-01** Migration `incc_indices` + model/factory/seeder + Pest isolamento admin.
  - Gate: `php artisan test --compact --filter=Incc`
- [ ] **T-02** Command `opim:fetch-incc` + schedule `08:05` `America/Sao_Paulo` + insert-only + teste com HTTP fake.
  - Gate: job não duplica competência; falha de API não quebra.
- [ ] **T-03** CRUD admin INCC + `GET hint` + OpenAPI.
- [ ] **T-04** `amenities` + pivôs + CRUD admin + `GET /builder/amenities`.
- [ ] **T-05** Migrations building endereço/defaults/wizard; tower `floors_count`; tabela `floors`; colunas de `units` (preço-base, ficha, `floor_id`, `frozen_price_brl`). Backfill `floors` a partir de `units.floor` existentes.
  - Parcial: endereço/wizard (T-07), `floors_count` + tabela `floors` (T-08), `units.floor_id` (T-09). Faltam defaults do prédio, colunas de ficha/preço-base e backfill.
- [ ] **T-06** `UnitPriceCalculator` + serialização de `price` calculado nas APIs builder/broker/public. Testes: sobe, desce, sem índice, `frozen_price_brl`.

## Backend — wizard

- [x] **T-07** POST/PATCH building com endereço; `GET /builder/cep/{cep}` (Http::fake ViaCEP).
- [x] **T-08** `PUT .../structure` (torres + andares) só rascunho; 409 se publicado.
  - Gate: `php artisan test --compact --filter=BuildingStructure`
- [x] **T-09** `PUT .../unit-grid` (planta típica, exceção redesenha andar, códigos `101…`); 422 andar com 0 unidades.
  - Gate: `php artisan test --compact --filter=BuildingUnitGrid`
- [ ] **T-10** Defaults + pivôs de adicionais; DTO une adicionais do prédio + unidade (unidade não remove o do prédio).
- [x] **T-11** `POST .../generate-description` (provider env, fake HTTP); PATCH `published` bloqueia sem preço.
  - Gate: `php artisan test --compact --filter=GenerateDescription`; publish sem preço 422.
- [ ] **T-12** OpenAPI completo dos endpoints novos/alterados.

## Frontend — construtora

- [x] **T-13** Rotas wizard + persistência por step + “Continuar cadastro” na listagem.
- [x] **T-14** Step 1 (CEP + endereço) + Vitest.
- [x] **T-15** Step 2 + `BuildingMassing` CSS clicável + Vitest de interação.
- [x] **T-16** Step 3 (grade, exceção, ficha, herança, adicionais).
  - Parcial: grade por torre, códigos, exceção de andar e tipo residencial/comercial. Ficha completa, herança e adicionais dependem de T-05/T-10.
- [x] **T-17** Step 4 (mídia interna/externa, descritivo, IA, switch rascunho).

## Frontend — admin + consumo

- [ ] **T-18** Admin: INCC (tabela, editar, hint) e adicionais.
- [ ] **T-19** Broker/público: preço calculado; campos novos no detalhe (subconjunto útil).

## Encerramento

- [ ] **T-20** Seeds demo (INCC, amenities, um building via estrutura) + TRACEABILITY + STATE.
