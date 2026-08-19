import { BuildingMassing } from '@/apps/builder/components/BuildingMassing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type TowerDraft = {
  key: string
  id?: number
  name: string
  floorsCount: number
}

export function emptyTowerDraft(index: number): TowerDraft {
  return {
    key: `tower-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Torre ${String.fromCharCode(65 + (index % 26))}`,
    floorsCount: 1,
  }
}

type BuildingWizardTowersStepProps = {
  towers: TowerDraft[]
  selectedTowerIndex: number
  selectedFloor: number | null
  onChange: (towers: TowerDraft[]) => void
  onSelectTower: (index: number) => void
  onSelectFloor: (towerIndex: number, floor: number) => void
}

function clampFloors(value: number): number {
  if (Number.isNaN(value) || value < 1) {
    return 1
  }

  return Math.min(80, value)
}

export function BuildingWizardTowersStep({
  towers,
  selectedTowerIndex,
  selectedFloor,
  onChange,
  onSelectTower,
  onSelectFloor,
}: BuildingWizardTowersStepProps) {
  function updateTower(index: number, patch: Partial<TowerDraft>) {
    onChange(towers.map((tower, current) => (current === index ? { ...tower, ...patch } : tower)))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
      <div className="space-y-4">
        {towers.map((tower, index) => (
          <Card
            key={tower.key}
            size="sm"
            className={index === selectedTowerIndex ? 'ring-2 ring-primary/40' : undefined}
          >
            <CardHeader>
              <CardTitle>
                <button type="button" className="text-left" onClick={() => onSelectTower(index)}>
                  {tower.name.trim() || `Torre ${index + 1}`}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor={`wizard-tower-name-${tower.key}`}>Nome da torre</Label>
                <Input
                  id={`wizard-tower-name-${tower.key}`}
                  value={tower.name}
                  onFocus={() => onSelectTower(index)}
                  onChange={(e) => updateTower(index, { name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`wizard-tower-floors-${tower.key}`}>Andares</Label>
                <Input
                  id={`wizard-tower-floors-${tower.key}`}
                  type="number"
                  min={1}
                  max={80}
                  value={tower.floorsCount}
                  onFocus={() => onSelectTower(index)}
                  onChange={(e) => updateTower(index, { floorsCount: clampFloors(Number(e.target.value)) })}
                  required
                />
              </div>
              {towers.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const next = towers.filter((_, current) => current !== index)
                    onChange(next)
                    onSelectTower(Math.min(index, next.length - 1))
                  }}
                >
                  Remover
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={() => onChange([...towers, emptyTowerDraft(towers.length)])}>
          Adicionar torre
        </Button>
      </div>

      <BuildingMassing
        towers={towers.map((tower) => ({ name: tower.name, floorsCount: tower.floorsCount }))}
        selectedTowerIndex={selectedTowerIndex}
        selectedFloor={selectedFloor}
        onSelectTower={onSelectTower}
        onSelectFloor={onSelectFloor}
      />
    </div>
  )
}
