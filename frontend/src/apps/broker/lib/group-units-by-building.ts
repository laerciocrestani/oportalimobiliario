import type { Building, Unit } from '@/lib/api'

export type BuildingWithUnits = Building & {
  units: Unit[]
}

export function groupUnitsByBuilding(units: Unit[]): BuildingWithUnits[] {
  const map = new Map<number, BuildingWithUnits>()

  for (const unit of units) {
    const building = unit.building
    if (!building) {
      continue
    }

    const existing = map.get(building.id)
    if (existing) {
      existing.units.push(unit)
      continue
    }

    map.set(building.id, {
      ...building,
      units: [unit],
    })
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function summarizeUnits(units: Unit[]) {
  return units.reduce(
    (summary, unit) => {
      summary.total += 1
      const status = unit.status as keyof typeof summary
      if (status in summary && status !== 'total') {
        summary[status] += 1
      }
      return summary
    },
    {
      total: 0,
      available: 0,
      pre_reserved: 0,
      reserved: 0,
      sold: 0,
      unavailable: 0,
    },
  )
}

export type BuilderFilterOption = {
  id: number
  name: string
}

export type BuildingFilters = {
  search: string
  builderId: string
}

export function getBuilderFilterOptions(buildings: BuildingWithUnits[]): BuilderFilterOption[] {
  const map = new Map<number, string>()

  for (const building of buildings) {
    if (building.tenant) {
      map.set(building.tenant.id, building.tenant.name)
    }
  }

  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function filterBuildings(
  buildings: BuildingWithUnits[],
  { search, builderId }: BuildingFilters,
): BuildingWithUnits[] {
  const normalizedSearch = search.trim().toLowerCase()

  return buildings.filter((building) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      building.name.toLowerCase().includes(normalizedSearch)

    const matchesBuilder =
      builderId.length === 0 || String(building.tenant?.id ?? '') === builderId

    return matchesSearch && matchesBuilder
  })
}
