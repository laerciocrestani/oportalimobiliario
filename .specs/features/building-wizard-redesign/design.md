---
feature: building-wizard-redesign
status: done
---

# Design — Redesenho do Wizard de Empreendimentos

Fonte: `docs/discovery/resumo-redesenho-wizard-empreendimentos.md` (aprovado 2026-09-18).
Sucede `.specs/features/building-wizard/design.md` (feature original entregue).

## C4 — containers (inalterado)

```
Construtora SPA ──► Laravel API ──► PostgreSQL
Cálculo de preço (unidade e VAGA): SOMENTE PostgreSQL (UnitPriceCalculator, INCC-M)
API ──► ViaCEP (proxy CEP)      API ──► Gemini/GPT (descritivo)
```

O redesenho é majoritariamente **frontend + ajustes de schema/validação**. Nenhum container novo. Cálculo de preço, INCC, adicionais, IA e ViaCEP são reaproveitados sem alteração de contrato.

## Decisões (ADR)

| ID | Decisão | Por quê | Alternativa rejeitada |
|----|---------|---------|-----------------------|
| D-R01 | **Vaga = `Unit`** em `Floor` com `kind='garage'` | Reaproveita `UnitPriceCalculator` (INCC), status (`available/reserved/sold`), serialização e o futuro vínculo reserva→vaga (unit↔unit) | Tabela `parking_spots` separada — duplicaria preço/status/serialização |
| D-R02 | Térreo = **andar 0**; positivos `101…`; negativos = garagem | Pedido do produto; térreo comporta lojas comerciais | Manter térreo=1 (não distingue subsolo/térreo) |
| D-R03 | `floors.number` vira **signed** (`smallInteger`) | Hoje é `unsignedSmallInteger` (não aceita negativo) | Coluna auxiliar de sinal — gambiarra |
| D-R04 | Clonagem é **operação de cliente**; preserve via `floors.customized` | Sem endpoint novo; grade final persiste no `unit-grid` | Endpoint `clone` no servidor — estado espalhado |
| D-R05 | Wizard 4→**3 steps**; ficha completa + defaults saem para edição pós-criação | Resolve “campos demais numa tela”; wizard cria só o esqueleto | Manter 4 steps com ficha completa (o problema atual) |
| D-R06 | **Editor em pilha** (compound components + `use()`) substitui `BuildingMassing` | Operações espaciais (espelho/clonagem/subsolo) pedem pilha clara | Massing CSS isométrico (baixo valor) |
| D-R07 | `FloorKind` ganha `garage`; herança de defaults inalterada | Tipo é bloco do andar | Flag booleana `is_garage` — não escala p/ novos tipos |
| D-R08 | Preço da vaga usa a **mesma** regra INCC-M (base+competência) | Consistência; zero código de cálculo novo | Preço fixo em R$ — divergiria da política INCC |

## Modelo de dados (delta sobre a feature original)

### `floors`
- `number`: `unsignedSmallInteger` → **`smallInteger`** (aceita 0 e negativos). `unique(tower_id, number)` mantido.
- `kind`: string com cast `FloorKind`; **novo valor `garage`** (só o enum muda; coluna já é string).
- **novo** `customized` boolean default `false` — marca andar editado manualmente (exceção). Reclonar preserva `customized=true`.

### `towers`
- **novo** `reference_floor` smallInteger nullable — número do andar-espelho memorizado (retomar clonagem preservando exceções).
- `floors_count` permanece (andares acima do solo). Subsolos derivam de `floors` com `kind='garage'` (número < 0).

### `units` (sem mudança de schema)
- Vaga reusa `Unit`: `private_area_m2` (área da vaga), `price_base`/`price_competence`, `status`. Campos de ficha ficam `null` (herdam/edita depois). `code` da vaga = `S{|floor|}-{pos:02}`.

### `App\Enums\FloorKind`
```php
enum FloorKind: string {
    case Residential = 'residential';
    case Commercial  = 'commercial';
    case Garage      = 'garage';   // novo
}
```

### Compatibilidade / backfill
- Empreendimentos existentes: `number` continua positivo, `customized=false`, `reference_floor=null`. **Não** renumera nem migra dados atuais (fora de escopo).
- Mudança de tipo em Postgres é widening (unsigned→signed) — segura. Testar `UnitFloorBackfill` e seeders/factories existentes.

## Numeração (premissa a validar no build)

| Andar | Regra | Código gerado |
|-------|-------|---------------|
| `> 0` | apartamentos/comercial | `{floor}{pos:02}` → `101`, `1005` |
| `= 0` | térreo (lojas comerciais) | `L{pos:02}` → `L01`, `L02` |
| `< 0` | subsolo (garagem) | `S{|floor|}-{pos:02}` → `S1-01`, `S2-03` |

## Algoritmo — espelho, clonagem e exceção (frontend, `floor-stack.ts`)

```
cloneMirror(tower, referenceNumber, { direction, from, to }):
  ref = floor(referenceNumber)
  for f in tower.floors where
      inRange(f.number, direction, from, to)
      and f.number != referenceNumber
      and f.kind == ref.kind
      and f.customized == false:            // preserva exceções
    f.units = ref.units.map((u, pos) => ({ ...u, code: unitCode(f.number, pos+1) }))

markException(f):  f.customized = true       // ao editar um andar manualmente
resetFloor(f):     f.customized = false; reapply(referenceNumber → f)
```

- Direção `up`/`down` relativa ao andar-espelho; garagem clona entre andares negativos (`kind='garage'`).
- Persistência: `unit-grid` grava `customized` por andar e `reference_floor` na torre, para a clonagem preservar exceções após retomar o rascunho.

## API (delta)

Prefixo `builder`, permissão `buildings.manage`. Ambos os PUT: **409** se `wizard_completed_at` ou `published`.

### `PUT /api/builder/buildings/{building}/structure` (step 2 — esqueleto)
```jsonc
{
  "towers": [
    {
      "name": "Torre A",
      "reference_floor": 1,
      "floors": [
        { "number": -2, "kind": "garage" },
        { "number": -1, "kind": "garage" },
        { "number": 0,  "kind": "commercial" },   // térreo/lojas
        { "number": 1,  "kind": "residential" }
        // ...
      ]
    }
  ]
}
```

### `PUT /api/builder/buildings/{building}/unit-grid` (step 2 — grade)
```jsonc
{
  "towers": [
    {
      "id": 10,
      "reference_floor": 1,
      "floors": [
        {
          "number": 1, "kind": "residential", "customized": false,
          "units": [
            { "code": "101", "private_area_m2": 50, "bedrooms": 2, "bathrooms": 1,
              "price_base": 320000, "price_competence": "2026-08" }
          ]
        },
        {
          "number": -1, "kind": "garage", "customized": false,
          "units": [ { "code": "S1-01", "private_area_m2": 12.5, "price_base": 45000, "price_competence": "2026-08" } ]
        }
      ]
    }
  ]
}
```

- Validação: min 1 unidade/andar; ao **publicar** (PATCH `published=true`), unidades/vagas `available` exigem `price_base` (422).
- Serialização de `Unit` já expõe `price` calculado (INCC) — vagas idem. Expor `floor.kind` e `floor.customized` no DTO de `Building`.

Inalterados: `POST/PATCH buildings`, `GET /builder/cep/{cep}`, `GET /builder/amenities`, `POST .../generate-description`, endpoints de mídia. **Sem** endpoint de clone.

## Frontend

Rotas mantidas: `/buildings/new` e `/buildings/:id/wizard`. React 19 (`use()`, `ref` como prop, sem `forwardRef`).

### Steps (variantes explícitas, sem props booleanas)
- `WizardIdentityStep` — nome + endereço (ViaCEP). *(reaproveita atual)*
- `WizardStructureStep` — o redesenho.
- `WizardPublishStep` — mídia interna/externa + descritivo/IA + switch Rascunho. *(merge do atual)*

### Composição (compound components + provider)
Estado desacoplado da UI via provider (dependency injection), conforme `vercel-composition-patterns`:

```
<BuildingWizardProvider building={draft} actions={{ persistStep }}>
  <Wizard.Frame>
    <Wizard.Steps />
    <WizardStructureStep />
  </Wizard.Frame>
</BuildingWizardProvider>
```

`StructureEditor` (novo, substitui `BuildingWizardTowersStep` + `BuildingWizardUnitsStep` + `BuildingMassing`):
- `StructureEditor.Provider` — torres, andar/torre selecionados, ações de esqueleto e clonagem.
- `StructureEditor.Skeleton` — perguntas guiadas: nº torres, andares acima, subsolos, unidades/andar → gera esqueleto (chama `PUT structure`).
- `StructureEditor.TowerTabs`.
- `StructureEditor.FloorStack` — pilha topo→base incl. subsolo; `content-visibility:auto` para torres altas.
- `StructureEditor.FloorRow` — resumo do andar; badges tipo/exceção; clique seleciona.
- `StructureEditor.MirrorPanel` — marca andar-espelho, faixa + direção, botão “Clonar”.
- `StructureEditor.UnitEditor` — `code`, `private_area_m2`, `bedrooms`, `bathrooms`, `price_base`, `price_competence`.
- `StructureEditor.GaragePanel` — vagas do subsolo (área + preço), mesmo `UnitEditor` reduzido.

Libs: novo `floor-stack.ts` (tipos + esqueleto + `cloneMirror`/`markException`/`resetFloor` + `unitCode` p/ 0/negativos + `payload`). Aposenta a lógica de `unit-grid.ts` (o payload permanece compatível).

## Riscos / mitigação

- **Signed em `floors.number`**: widening seguro; cobrir com teste de migração + rerun de seeders/factories.
- **Acoplamento com reservas** (vaga vendida via reserva, 1+ por unidade): contrato explícito — *inventário aqui, vínculo na feature de reservas*. Como vaga é `Unit`, o vínculo futuro é unit↔unit (pivô a nascer lá).
- **Preserve na clonagem**: exige persistir `customized`/`reference_floor`; testar retomada de rascunho.
- **Torres altas (30+)**: `FloorStack` com `content-visibility` e componentes memoizados.
- **Remoção de `BuildingMassing`**: migrar/reescrever `BuildingMassing.test.tsx` para o `FloorStack`.

## Plano de implementação (resumo; detalhe em `tasks.md`)

Backend antes do frontend. 1 commit atômico por task; gate de teste por task.

1. Migrations (`number` signed, `customized`, `reference_floor`) + `FloorKind::Garage` + Pest.
2. `structure` aceita 0/negativo/garagem + `reference_floor`; validação; Pest.
3. `unit-grid` aceita vagas + `customized`; geração de código servidor; publish exige preço (incl. vagas); Pest.
4. Serialização (`floor.kind`/`customized` no DTO; preço da vaga) + OpenAPI.
5. Frontend: wizard 3 steps + `BuildingWizardProvider` + persistência por step.
6. `StructureEditor` (skeleton + tabs + stack + unit editor) + Vitest.
7. Espelho/clonagem (`floor-stack.ts`) + preserve de exceção + Vitest.
8. `GaragePanel` (vagas área+preço) + Vitest.
9. Aposentar `BuildingMassing`; mover ficha completa + defaults para edição pós-criação.
10. Seeds/factories (andar garagem, lojas no térreo) + TRACEABILITY (+ STATE pelo orquestrador).
