import { useMemo, useState } from 'react'
import { groupUnitsByFloor } from '@/apps/builder/lib/group-units-by-floor'
import { unitStatusColors, unitStatusLegend, type UnitStatus } from '@/apps/builder/lib/unit-status'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Tower, Unit } from '@/lib/api'

type DigitalMirrorProps = {
  buildingName: string
  towers: Tower[]
  onUnitSelect: (unit: Unit) => void
}

function unitAreaWeight(unit: Unit): number {
  const area = Number(unit.area_m2)
  return Number.isFinite(area) && area > 0 ? area : 1
}

function MirrorGrid({
  tower,
  onUnitSelect,
}: {
  tower: Tower
  onUnitSelect: (unit: Unit) => void
}) {
  const floorGroups = useMemo(
    () => groupUnitsByFloor(tower.units ?? []),
    [tower.units],
  )

  if (floorGroups.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma unidade nesta torre.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{tower.name}</Badge>
        {tower.units_summary ? (
          <span className="text-xs text-muted-foreground">
            {tower.units_summary.total} unidades
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        {floorGroups.map((group) => (
          <div key={group.label} className="flex items-stretch gap-2">
            <div className="flex w-14 shrink-0 items-center justify-center rounded-md bg-muted px-2 py-3 text-xs font-medium text-muted-foreground">
              {group.label}
            </div>
            <div className="flex min-h-12 flex-1 gap-1">
              {group.units.map((unit) => {
                const status = unit.status as UnitStatus
                const color = unitStatusColors[status] ?? 'bg-muted'

                return (
                  <button
                    key={unit.id}
                    type="button"
                    className={`flex min-w-16 items-center justify-center rounded-md px-2 py-3 text-xs font-medium text-white transition-opacity hover:opacity-90 ${color}`}
                    style={{ flexGrow: unitAreaWeight(unit) }}
                    onClick={() => onUnitSelect(unit)}
                    aria-label={`Unidade ${unit.code}`}
                  >
                    {unit.code}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DigitalMirror({ buildingName, towers, onUnitSelect }: DigitalMirrorProps) {
  const sortedTowers = useMemo(
    () =>
      [...towers].sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order
        }

        return a.name.localeCompare(b.name)
      }),
    [towers],
  )

  const [activeTowerId, setActiveTowerId] = useState<string>(
    sortedTowers[0] ? String(sortedTowers[0].id) : '',
  )

  if (sortedTowers.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma torre cadastrada.</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">{buildingName}</p>
        <p className="text-xs text-muted-foreground">Espelho digital por andar</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {unitStatusLegend.map(({ status, label, color }) => (
          <span key={status} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`size-2.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {sortedTowers.length === 1 ? (
        <MirrorGrid tower={sortedTowers[0]} onUnitSelect={onUnitSelect} />
      ) : (
        <Tabs value={activeTowerId} onValueChange={setActiveTowerId}>
          <TabsList>
            {sortedTowers.map((tower) => (
              <TabsTrigger key={tower.id} value={String(tower.id)}>
                {tower.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {sortedTowers.map((tower) => (
            <TabsContent key={tower.id} value={String(tower.id)} className="mt-4">
              <MirrorGrid tower={tower} onUnitSelect={onUnitSelect} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
