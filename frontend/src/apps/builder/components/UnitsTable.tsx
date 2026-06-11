import { useMemo, useState } from 'react'
import { formatPrice } from '@/apps/builder/lib/format-price'
import { unitStatusLabels, unitStatusLegend, type UnitStatus } from '@/apps/builder/lib/unit-status'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Tower, Unit, UnitsSummary } from '@/lib/api'

type UnitsTableProps = {
  units: Unit[]
  towers?: Tower[]
  unitsSummary?: UnitsSummary
  onUnitSelect: (unit: Unit) => void
}

export function UnitsTable({ units, towers = [], unitsSummary, onUnitSelect }: UnitsTableProps) {
  const [towerFilter, setTowerFilter] = useState<string>('all')

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

  const filteredUnits = useMemo(() => {
    if (towerFilter === 'all') {
      return units
    }

    return units.filter((unit) => String(unit.tower_id ?? unit.tower?.id) === towerFilter)
  }, [towerFilter, units])

  return (
    <div className="space-y-3">
      {unitsSummary ? (
        <div className="flex flex-wrap gap-3">
          <span className="text-xs text-muted-foreground">
            Total: <strong className="text-foreground">{unitsSummary.total}</strong>
          </span>
          {unitStatusLegend.map(({ status, label, color }) => {
            const count = unitsSummary[status]
            if (!count) {
              return null
            }

            return (
              <span key={status} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`size-2 rounded-full ${color}`} />
                {count} {label.toLowerCase()}
              </span>
            )
          })}
        </div>
      ) : null}

      {sortedTowers.length > 1 ? (
        <Tabs value={towerFilter} onValueChange={setTowerFilter}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            {sortedTowers.map((tower) => (
              <TabsTrigger key={tower.id} value={String(tower.id)}>
                {tower.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Torre</th>
              <th className="px-4 py-3 font-medium">Andar</th>
              <th className="px-4 py-3 font-medium">Área</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnits.map((unit) => (
              <tr
                key={unit.id}
                className="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-muted/40"
                onClick={() => onUnitSelect(unit)}
              >
                <td className="px-4 py-3 font-medium">{unit.code}</td>
                <td className="px-4 py-3">{unit.tower?.name ?? '—'}</td>
                <td className="px-4 py-3">{unit.floor ?? '—'}</td>
                <td className="px-4 py-3">{unit.area_m2 ? `${unit.area_m2} m²` : '—'}</td>
                <td className="px-4 py-3">{formatPrice(unit.price)}</td>
                <td className="px-4 py-3">
                  {unitStatusLabels[unit.status as UnitStatus] ?? unit.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUnits.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma unidade cadastrada.</p>
      ) : null}
    </div>
  )
}
