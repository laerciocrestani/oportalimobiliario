import type { Unit } from '@/lib/api'

export type FloorGroup = {
  floor: number | null
  label: string
  units: Unit[]
}

export function floorLabel(floor: number | null): string {
  if (floor === null) {
    return 'Sem andar'
  }

  return `${floor}°`
}

export function groupUnitsByFloor(units: Unit[]): FloorGroup[] {
  const byFloor = new Map<number | null, Unit[]>()

  for (const unit of units) {
    const floor = unit.floor ?? null
    const group = byFloor.get(floor) ?? []
    group.push(unit)
    byFloor.set(floor, group)
  }

  return [...byFloor.entries()]
    .sort(([a], [b]) => {
      if (a === null) {
        return 1
      }
      if (b === null) {
        return -1
      }

      return b - a
    })
    .map(([floor, floorUnits]) => ({
      floor,
      label: floorLabel(floor),
      units: floorUnits.toSorted((a, b) => a.code.localeCompare(b.code)),
    }))
}
