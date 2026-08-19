import { BuildingMassing } from '@/apps/builder/components/BuildingMassing'
import {
  applyTypicalAreaToMatchingFloors,
  applyTypicalToTower,
  emptyTypicalSlots,
  redesignFloorUnits,
  typicalPositionHint,
  type TowerUnitGrid,
} from '@/apps/builder/lib/unit-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FloorKind } from '@/lib/api'
import { cn } from '@/lib/utils'

type BuildingWizardUnitsStepProps = {
  grids: TowerUnitGrid[]
  selectedTowerIndex: number
  selectedFloor: number | null
  onChange: (grids: TowerUnitGrid[]) => void
  onSelectTower: (index: number) => void
  onSelectFloor: (towerIndex: number, floor: number) => void
}

function clampTypical(value: number): number {
  if (Number.isNaN(value) || value < 1) {
    return 1
  }

  return Math.min(20, value)
}

export function BuildingWizardUnitsStep({
  grids,
  selectedTowerIndex,
  selectedFloor,
  onChange,
  onSelectTower,
  onSelectFloor,
}: BuildingWizardUnitsStepProps) {
  if (grids.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Salve as torres no passo 2 para gerar as unidades de cada torre.
      </p>
    )
  }

  const towerIndex = Math.min(selectedTowerIndex, grids.length - 1)
  const grid = grids[towerIndex]
  const floorNumber = selectedFloor ?? grid.floors[0]?.number ?? 1
  const floor = grid.floors.find((item) => item.number === floorNumber) ?? grid.floors[0]
  const floorNumbersList = grid.floors.map((item) => item.number)

  function updateGrid(next: TowerUnitGrid) {
    onChange(grids.map((item, index) => (index === towerIndex ? next : item)))
  }

  function updateFloor(patch: Partial<typeof floor>) {
    if (!floor) {
      return
    }

    updateGrid({
      ...grid,
      floors: grid.floors.map((item) => (item.number === floor.number ? { ...item, ...patch } : item)),
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {grids.map((item, index) => (
            <Button
              key={item.towerId}
              type="button"
              variant={index === towerIndex ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                onSelectTower(index)
                onSelectFloor(index, item.floors[0]?.number ?? 1)
              }}
            >
              {item.name}
            </Button>
          ))}
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div>
            <h3 className="text-sm font-medium">Planta típica desta torre</h3>
            <p className="text-xs text-muted-foreground">
              A metragem da posição replica nos andares: 101, 201 e 301 ficam iguais. Um andar
              diferente (exceção) não é alterado até você aplicar de novo.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[7rem_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="wizard-typical-units">Unidades por andar</Label>
              <Input
                id="wizard-typical-units"
                type="number"
                min={1}
                max={20}
                value={grid.typicalCount}
                onChange={(e) => {
                  const typicalCount = clampTypical(Number(e.target.value))
                  updateGrid({
                    ...grid,
                    typicalCount,
                    typicalSlots: emptyTypicalSlots(typicalCount, grid.typicalSlots),
                  })
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => updateGrid(applyTypicalToTower(grid, grid.typicalCount))}
            >
              Aplicar em todos os andares desta torre
            </Button>
          </div>

          <div className="space-y-2">
            {grid.typicalSlots.map((slot, positionIndex) => (
              <div key={`typical-${positionIndex}`} className="grid gap-2 sm:grid-cols-[1fr_8rem] sm:items-end">
                <p className="text-sm">
                  Posição {positionIndex + 1}
                  <span className="block text-xs text-muted-foreground">
                    {typicalPositionHint(floorNumbersList, positionIndex + 1)}
                  </span>
                </p>
                <div className="space-y-1">
                  <Label htmlFor={`wizard-typical-area-${positionIndex}`}>
                    Área da posição {positionIndex + 1} (m²)
                  </Label>
                  <Input
                    id={`wizard-typical-area-${positionIndex}`}
                    inputMode="decimal"
                    placeholder="72"
                    value={slot.areaM2}
                    onChange={(e) =>
                      updateGrid(applyTypicalAreaToMatchingFloors(grid, positionIndex, e.target.value))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {floor ? (
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">
                {grid.name} — andar {floor.number}
              </h3>
              <div className="flex gap-2">
                {(['residential', 'commercial'] as const).map((kind: FloorKind) => (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant={floor.kind === kind ? 'default' : 'outline'}
                    onClick={() => updateFloor({ kind })}
                  >
                    {kind === 'residential' ? 'Residencial' : 'Comercial'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {floor.units.map((unit, unitIndex) => (
                <div key={unit.key} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label htmlFor={`wizard-unit-${unit.key}`}>Unidade {unitIndex + 1}</Label>
                    <Input
                      id={`wizard-unit-${unit.key}`}
                      value={unit.code}
                      onChange={(e) =>
                        updateFloor({
                          units: floor.units.map((item) =>
                            item.key === unit.key ? { ...item, code: e.target.value } : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`wizard-unit-area-${unit.key}`}>Área da unidade {unit.code} (m²)</Label>
                    <Input
                      id={`wizard-unit-area-${unit.key}`}
                      inputMode="decimal"
                      value={unit.areaM2}
                      onChange={(e) =>
                        updateFloor({
                          units: floor.units.map((item) =>
                            item.key === unit.key ? { ...item, areaM2: e.target.value } : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={floor.units.length < 2}
                    onClick={() =>
                      updateFloor({
                        units: redesignFloorUnits(floor.number, floor.units.length - 1, grid.typicalSlots),
                      })
                    }
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                updateFloor({
                  units: redesignFloorUnits(floor.number, floor.units.length + 1, grid.typicalSlots),
                })
              }
            >
              Adicionar unidade neste andar
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <BuildingMassing
          towers={grids.map((item) => ({
            name: item.name,
            floorsCount: item.floors.length,
          }))}
          selectedTowerIndex={towerIndex}
          selectedFloor={floorNumber}
          onSelectTower={onSelectTower}
          onSelectFloor={onSelectFloor}
        />
        <p className={cn('text-center text-xs text-muted-foreground')}>
          Clique numa torre ou andar para editar a planta daquele bloco.
        </p>
      </div>
    </div>
  )
}
