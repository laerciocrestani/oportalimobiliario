import type { BuildingStructurePayload, BuildingUnitGridPayload, FloorKind } from '@/lib/api'

/** @see REQ-WZR-002 @see REQ-WZR-004 @see REQ-WZR-005 @see REQ-WZR-006 */

export type CloneDirection = 'up' | 'down'

export type CloneRange = {
  direction: CloneDirection
  from: number
  to: number
}

export type SkeletonInput = {
  towerCount: number
  floorsAbove: number
  basementCount: number
  unitsPerFloor: number
  spotsPerBasement?: number
}

export type StackUnit = {
  key: string
  code: string
  areaM2: string
  bedrooms: string
  bathrooms: string
  priceBase: string
  priceCompetence: string
}

export type StackFloor = {
  number: number
  kind: FloorKind
  customized: boolean
  units: StackUnit[]
}

export type StackTower = {
  key: string
  id?: number
  name: string
  referenceFloor: number | null
  floors: StackFloor[]
}

export const DEFAULT_UNITS_PER_FLOOR = 4

export function unitCode(floorNumber: number, position: number): string {
  if (floorNumber < 0) {
    return `S${Math.abs(floorNumber)}-${String(position).padStart(2, '0')}`
  }

  if (floorNumber === 0) {
    return `L${String(position).padStart(2, '0')}`
  }

  return `${floorNumber}${String(position).padStart(2, '0')}`
}

export function buildSkeleton(input: SkeletonInput): StackTower[] {
  const towerCount = Math.max(1, input.towerCount)
  const floorsAbove = Math.max(0, input.floorsAbove)
  const basementCount = Math.max(0, input.basementCount)
  const unitsPerFloor = Math.max(1, input.unitsPerFloor)
  const spotsPerBasement = Math.max(1, input.spotsPerBasement ?? unitsPerFloor)

  return Array.from({ length: towerCount }, (_, index) => {
    const floors: StackFloor[] = []

    for (let level = basementCount; level >= 1; level -= 1) {
      floors.push(makeFloor(-level, 'garage', spotsPerBasement))
    }

    floors.push(makeFloor(0, 'commercial', unitsPerFloor))

    for (let number = 1; number <= floorsAbove; number += 1) {
      floors.push(makeFloor(number, 'residential', unitsPerFloor))
    }

    return {
      key: draftKey(`tower-${index}`),
      name: `Torre ${String.fromCharCode(65 + (index % 26))}`,
      referenceFloor: floorsAbove > 0 ? 1 : 0,
      floors,
    }
  })
}

export function cloneMirror(tower: StackTower, referenceNumber: number, range: CloneRange): StackTower {
  const reference = tower.floors.find((item) => item.number === referenceNumber)

  if (!reference) {
    return tower
  }

  return {
    ...tower,
    referenceFloor: referenceNumber,
    floors: tower.floors.map((item) => {
      if (
        !inCloneRange(item.number, referenceNumber, range) ||
        item.kind !== reference.kind ||
        item.customized
      ) {
        return item
      }

      return {
        ...item,
        units: copyUnitsToFloor(reference.units, item.number),
      }
    }),
  }
}

export function markException(tower: StackTower, floorNumber: number): StackTower {
  return {
    ...tower,
    floors: tower.floors.map((item) =>
      item.number === floorNumber ? { ...item, customized: true } : item,
    ),
  }
}

export function resetFloor(tower: StackTower, floorNumber: number): StackTower {
  const referenceNumber = tower.referenceFloor
  const reference =
    referenceNumber == null ? undefined : tower.floors.find((item) => item.number === referenceNumber)

  return {
    ...tower,
    floors: tower.floors.map((item) => {
      if (item.number !== floorNumber) {
        return item
      }

      if (!reference || reference.kind !== item.kind || reference.number === item.number) {
        return { ...item, customized: false }
      }

      return {
        ...item,
        customized: false,
        units: copyUnitsToFloor(reference.units, item.number),
      }
    }),
  }
}

export function structurePayload(towers: StackTower[]): BuildingStructurePayload {
  return {
    towers: towers.map((tower) => ({
      name: tower.name,
      reference_floor: tower.referenceFloor,
      floors: tower.floors.map((item) => ({
        number: item.number,
        kind: item.kind,
      })),
    })),
  }
}

export function unitGridPayload(towers: StackTower[]): BuildingUnitGridPayload {
  return {
    towers: towers.flatMap((tower) => {
      if (tower.id == null || tower.id <= 0) {
        return []
      }

      return [
        {
          id: tower.id,
          reference_floor: tower.referenceFloor,
          floors: tower.floors.map((item) => ({
            number: item.number,
            kind: item.kind,
            customized: item.customized,
            units: item.units.map((unit) => ({
              code: unit.code.trim(),
              private_area_m2: parseNumber(unit.areaM2),
              bedrooms: parseOptionalInt(unit.bedrooms),
              bathrooms: parseOptionalInt(unit.bathrooms),
              price_base: parseNumber(unit.priceBase),
              price_competence: parseCompetence(unit.priceCompetence),
            })),
          })),
        },
      ]
    }),
  }
}

function makeFloor(number: number, kind: FloorKind, unitCount: number): StackFloor {
  return {
    number,
    kind,
    customized: false,
    units: Array.from({ length: unitCount }, (_, index) => emptyUnit(number, index + 1)),
  }
}

function emptyUnit(floorNumber: number, position: number): StackUnit {
  return {
    key: draftKey(`u-${floorNumber}-${position}`),
    code: unitCode(floorNumber, position),
    areaM2: '',
    bedrooms: '',
    bathrooms: '',
    priceBase: '',
    priceCompetence: '',
  }
}

function copyUnitsToFloor(units: StackUnit[], floorNumber: number): StackUnit[] {
  return units.map((unit, index) => ({
    ...unit,
    key: draftKey(`u-${floorNumber}-${index + 1}`),
    code: unitCode(floorNumber, index + 1),
  }))
}

function inCloneRange(floorNumber: number, referenceNumber: number, range: CloneRange): boolean {
  const low = Math.min(range.from, range.to)
  const high = Math.max(range.from, range.to)

  if (floorNumber < low || floorNumber > high || floorNumber === referenceNumber) {
    return false
  }

  return range.direction === 'up' ? floorNumber > referenceNumber : floorNumber < referenceNumber
}

function draftKey(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function parseNumber(value: string): number | null {
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

function parseOptionalInt(value: string): number | null {
  const normalized = value.trim()

  if (normalized === '') {
    return null
  }

  const parsed = Number(normalized)

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function parseCompetence(value: string): string | null {
  const normalized = value.trim()

  if (normalized === '') {
    return null
  }

  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return `${normalized}-01`
  }

  return normalized
}
