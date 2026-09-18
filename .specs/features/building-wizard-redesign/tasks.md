---
feature: building-wizard-redesign
status: in_progress
---

# Tasks — building-wizard-redesign

Ordem: backend (schema → validação → API) antes do frontend. 1 commit atômico por task. Comandos sempre via Docker.

## Backend — fundação

- [x] **TR-01** Migration: `floors.number` `unsignedSmallInteger`→`smallInteger`; add `floors.customized` boolean default false; add `towers.reference_floor` smallInteger nullable. `FloorKind::Garage`. Atualizar `Floor`/`Tower` fillable+casts.
  - Gate: `php artisan test --compact --filter=BuildingStructure` e `--filter=UnitFloor` verdes; seeders/factories existentes não quebram.
- [x] **TR-02** `PUT .../structure`: aceitar `number` 0/negativo e `kind=garage`; persistir `reference_floor`; 409 se publicado; 422 estrutura inválida.
  - Gate: `php artisan test --compact --filter=BuildingStructure` (casos: térreo 0, subsolos negativos, garagem, reference_floor).

## Backend — grade e garagem

- [ ] **TR-03** `PUT .../unit-grid`: aceitar vagas (andar `garage`) e `customized` por andar; geração/validação de código (`101`/`L01`/`S1-01`); min 1 unidade/andar (422).
  - Gate: `php artisan test --compact --filter=BuildingUnitGrid` (vaga, exceção `customized`, códigos).
- [ ] **TR-04** Publish (`PATCH published=true`) exige `price_base` em unidades/vagas `available` (422). Serializar `floor.kind`/`customized` no DTO `Building`; garantir `price` calculado nas vagas.
  - Gate: `--filter=BuildingPriceCalculation` e publish sem preço → 422.
- [ ] **TR-05** OpenAPI: atualizar `structure`/`unit-grid` (0/negativo, garagem, `customized`, `reference_floor`) e schema `Building`/`Floor`.
  - Gate: `docs/api/openapi.yaml` versionado; lint OK.

## Frontend — wizard e editor

- [ ] **TR-06** Wizard 3 steps + `BuildingWizardProvider` (compound + `use()`) + persistência por step + “Continuar cadastro”.
  - Gate: `pnpm test` `BuildingWizardPage.test.tsx` (navegação 3 steps, retomada).
- [ ] **TR-07** `floor-stack.ts`: tipos, esqueleto, `unitCode` (0/negativos), `cloneMirror`/`markException`/`resetFloor`, `payload`. Testes unitários.
  - Gate: `pnpm test` `floor-stack.test.ts` (clonagem faixa acima/abaixo, preserve exceção, códigos térreo/subsolo).
- [ ] **TR-08** `StructureEditor` (Skeleton + TowerTabs + FloorStack + FloorRow + UnitEditor) + Vitest de interação.
  - Gate: `pnpm test` `StructureEditor.test.tsx` (gera esqueleto, edita andar, marca exceção).
- [ ] **TR-09** `MirrorPanel` (espelho + faixa + direção + clonar) e `GaragePanel` (vagas área+preço) + Vitest.
  - Gate: `pnpm test` (clonar preserva exceção; vaga com área+preço).
- [ ] **TR-10** Aposentar `BuildingMassing`; migrar `BuildingMassing.test.tsx` para `FloorStack`. Mover ficha completa + defaults de herança para a edição pós-criação (telas de detalhe).
  - Gate: `pnpm test` sem referências mortas; edição pós-criação cobre os campos removidos do wizard.

## Encerramento

- [ ] **TR-11** Seeds demo (torre com subsolo/garagem + lojas no térreo + apartamentos clonados) + `TRACEABILITY.md` (REQ-WZR-*). `STATE.md` apenas pelo orquestrador.
  - Gate: seed roda; `php artisan test` e `pnpm test` verdes.

## Follow-up (fora desta fatia)

- Vínculo vaga↔unidade na reserva (feature de reservas): pivô unit↔unit, 1+ vagas por reserva.
- Renumeração/migração de empreendimentos legados para o esquema de andar 0.
