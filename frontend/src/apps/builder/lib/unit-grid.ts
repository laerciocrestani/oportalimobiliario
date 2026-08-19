import type { Building, FloorKind, Tower } from '@/lib/api'

export type TypicalSlot = {
  areaM2: string
}

export type GridUnit = {
  key: string
  code: string
  areaM2: string
}

export type GridFloor = {
  number: number
  kind: FloorKind
  units: GridUnit[]
}

export type TowerUnitGrid = {
  towerId: number
  name: string
  typicalCount: number
  typicalSlots: TypicalSlot[]
  floors: GridFloor[]
}

export const DEFAULT_TYPICAL_UNITS = 4

export function unitCode(floor: number, position: number): string {
  return `${floor}${String(position).padStart(2, '0')}`
}

export function typicalPositionHint(floorNumbers: number[], position: number): string {
  const samples = floorNumbers.slice(0, 3).map((floor) => unitCode(floor, position))
  const extra = floorNumbers.length > 3 ? '…' : ''

  return `${samples.join(', ')}${extra}`
}

function draftKey(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptyTypicalSlots(count: number, previous: TypicalSlot[] = []): TypicalSlot[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    areaM2: previous[index]?.areaM2 ?? '',
  }))
}

export function makeFloorUnits(floor: number, slots: TypicalSlot[]): GridUnit[] {
  return slots.map((slot, index) => ({
    key: draftKey(`u-${floor}-${index + 1}`),
    code: unitCode(floor, index + 1),
    areaM2: slot.areaM2,
  }))
}

export function redesignFloorUnits(floor: number, count: number, slots: TypicalSlot[] = []): GridUnit[] {
  return makeFloorUnits(floor, emptyTypicalSlots(count, slots))
}

export function parseAreaM2(value: string): number | null {
  const normalized = value.trim().replace(',', '.')

  if (normalized === '') {
    return null
  }

  const parsed = Number(normalized)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function typicalCountFromFloors(floors: GridFloor[]): number {
  if (floors.length === 0) {
    return DEFAULT_TYPICAL_UNITS
  }

  const counts = floors.map((floor) => floor.units.length)
  const frequency = new Map<number, number>()

  for (const count of counts) {
    frequency.set(count, (frequency.get(count) ?? 0) + 1)
  }

  let typical = counts[0]
  let best = 0

  for (const [count, times] of frequency) {
    if (times > best) {
      typical = count
      best = times
    }
  }

  return typical
}

function typicalSlotsFromFloors(floors: GridFloor[], typicalCount: number): TypicalSlot[] {
  const sample = floors.find((floor) => floor.units.length === typicalCount) ?? floors[0]

  return emptyTypicalSlots(typicalCount, sample?.units.map((unit) => ({ areaM2: unit.areaM2 })) ?? [])
}

function floorNumbers(tower: Tower): number[] {
  if (tower.floors?.length) {
    return tower.floors.map((floor) => floor.number).toSorted((a, b) => a - b)
  }

  const count = tower.floors_count ?? 1

  return Array.from({ length: Math.max(1, count) }, (_, index) => index + 1)
}

function displayArea(value: string | null | undefined): string {
  if (value == null || value === '') {
    return ''
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return String(value)
  }

  return String(parsed)
}

export function gridsFromBuilding(building: Building): TowerUnitGrid[] {
  return (building.towers ?? [])
    .filter((tower) => tower.id > 0)
    .map((tower) => {
      const towerUnits = [
        ...(tower.units ?? []),
        ...((building.units ?? []).filter((unit) => unit.tower_id === tower.id)),
      ]
      const uniqueUnits = [...new Map(towerUnits.map((unit) => [unit.id ?? unit.code, unit])).values()]

      const floors: GridFloor[] = floorNumbers(tower).map((number) => {
        const meta = tower.floors?.find((floor) => floor.number === number)
        const existing = uniqueUnits
          .filter((unit) => unit.floor === number)
          .toSorted((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))

        return {
          number,
          kind: meta?.kind ?? 'residential',
          units:
            existing.length > 0
              ? existing.map((unit) => ({
                  key: String(unit.id ?? draftKey(`u-${number}`)),
                  code: unit.code,
                  areaM2: displayArea(unit.area_m2),
                }))
              : makeFloorUnits(number, emptyTypicalSlots(DEFAULT_TYPICAL_UNITS)),
        }
      })

      const typicalCount = typicalCountFromFloors(floors)

      return {
        towerId: tower.id,
        name: tower.name,
        typicalCount,
        typicalSlots: typicalSlotsFromFloors(floors, typicalCount),
        floors,
      }
    })
}

export function applyTypicalToTower(grid: TowerUnitGrid, typicalCount: number): TowerUnitGrid {
  const count = Math.min(20, Math.max(1, typicalCount))
  const typicalSlots = emptyTypicalSlots(count, grid.typicalSlots)

  return {
    ...grid,
    typicalCount: count,
    typicalSlots,
    floors: grid.floors.map((floor) => ({
      ...floor,
      units: makeFloorUnits(floor.number, typicalSlots),
    })),
  }
}

export function applyTypicalAreaToMatchingFloors(
  grid: TowerUnitGrid,
  positionIndex: number,
  areaM2: string,
): TowerUnitGrid {
  const typicalSlots = grid.typicalSlots.map((slot, index) =>
    index === positionIndex ? { ...slot, areaM2 } : slot,
  )

  return {
    ...grid,
    typicalSlots,
    floors: grid.floors.map((floor) => {
      if (floor.units.length !== typicalSlots.length) {
        return floor
      }

      return {
        ...floor,
        units: floor.units.map((unit, index) =>
          index === positionIndex ? { ...unit, areaM2 } : unit,
        ),
      }
    }),
  }
}

export function unitGridPayload(grids: TowerUnitGrid[]) {
  return {
    towers: grids.map((grid) => ({
      id: grid.towerId,
      floors: grid.floors.map((floor) => ({
        number: floor.number,
        kind: floor.kind,
        units: floor.units.map((unit) => ({
          code: unit.code.trim(),
          area_m2: parseAreaM2(unit.areaM2),
        })),
      })),
    })),
  }
}

export function unitGridIsValid(grids: TowerUnitGrid[]): boolean {
  if (grids.length === 0) {
    return false
  }

  return grids.every((grid) =>
    grid.floors.every((floor) => {
      if (floor.units.length < 1) {
        return false
      }

      const codes = floor.units.map((unit) => unit.code.trim())

      return codes.every((code) => code !== '')
    }),
  )
}
