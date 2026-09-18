import type { Building, BuildingStructurePayload, BuildingUnitGridPayload, FloorKind, Unit } from '@/lib/api'

/** @see REQ-WZR-002 @see REQ-WZR-004 @see REQ-WZR-005 @see REQ-WZR-006 */

export type CloneDirection = 'up' | 'down'

export type CloneRange = {
  direction: CloneDirection
  from: number
  to: number
}

export type MirrorDraft = CloneRange & {
  referenceNumber: number
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

export const DEFAULT_SKELETON: SkeletonInput = {
  towerCount: 1,
  floorsAbove: 1,
  basementCount: 0,
  unitsPerFloor: DEFAULT_UNITS_PER_FLOOR,
  spotsPerBasement: DEFAULT_UNITS_PER_FLOOR,
}

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

export const DEFAULT_MIRROR: MirrorDraft = {
  referenceNumber: 1,
  direction: 'up',
  from: 2,
  to: 2,
}

export function mirrorDraftFromTower(tower: StackTower | null | undefined): MirrorDraft {
  if (!tower || tower.floors.length === 0) {
    return { ...DEFAULT_MIRROR }
  }

  const referenceNumber =
    tower.referenceFloor ??
    tower.floors.find((item) => item.kind === 'residential')?.number ??
    tower.floors[0].number
  const kind = tower.floors.find((item) => item.number === referenceNumber)?.kind
  const others = tower.floors.filter((item) => item.kind === kind && item.number !== referenceNumber)
  const above = others.filter((item) => item.number > referenceNumber)
  const below = others.filter((item) => item.number < referenceNumber)
  const targets = above.length > 0 ? above : below
  const numbers = targets.map((item) => item.number)

  return {
    referenceNumber,
    direction: above.length > 0 ? 'up' : 'down',
    from: numbers.length > 0 ? Math.min(...numbers) : referenceNumber,
    to: numbers.length > 0 ? Math.max(...numbers) : referenceNumber,
  }
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

export function updateFloorUnit(
  tower: StackTower,
  floorNumber: number,
  unitKey: string,
  patch: Partial<StackUnit>,
): StackTower {
  return markException(
    {
      ...tower,
      floors: tower.floors.map((item) =>
        item.number !== floorNumber
          ? item
          : {
              ...item,
              units: item.units.map((unit) => (unit.key === unitKey ? { ...unit, ...patch } : unit)),
            },
      ),
    },
    floorNumber,
  )
}

export function floorLabel(number: number): string {
  if (number > 0) {
    return `Andar ${number}`
  }

  if (number === 0) {
    return 'Térreo'
  }

  return `Subsolo ${Math.abs(number)}`
}

export function floorKindLabel(kind: FloorKind): string {
  if (kind === 'garage') {
    return 'Garagem'
  }

  if (kind === 'commercial') {
    return 'Comercial'
  }

  return 'Residencial'
}

export function floorsTopToBottom(floors: StackFloor[]): StackFloor[] {
  return floors.toSorted((left, right) => right.number - left.number)
}

export function isFloorStackValid(towers: StackTower[]): boolean {
  return (
    towers.length > 0 &&
    towers.every(
      (tower) =>
        tower.name.trim() !== '' &&
        tower.floors.every(
          (floor) => floor.units.length >= 1 && floor.units.every((unit) => unit.code.trim() !== ''),
        ),
    )
  )
}

export function applySavedTowerIds(stack: StackTower[], saved: Building): StackTower[] {
  const savedTowers = saved.towers ?? []

  return stack.map((tower, index) => {
    const match = savedTowers.find((item) => item.name === tower.name) ?? savedTowers[index]

    if (!match) {
      return tower
    }

    return {
      ...tower,
      id: match.id,
      key: String(match.id),
    }
  })
}

export function stacksFromBuilding(building: Building): StackTower[] {
  return (building.towers ?? [])
    .filter((tower) => tower.id > 0)
    .map((tower, index) => {
      const towerUnits = [
        ...(tower.units ?? []),
        ...((building.units ?? []).filter((unit) => unit.tower_id === tower.id)),
      ]
      const uniqueUnits = [...new Map(towerUnits.map((unit) => [unit.id ?? unit.code, unit])).values()]
      const metas = tower.floors?.length
        ? tower.floors
        : Array.from({ length: Math.max(1, tower.floors_count ?? 1) }, (_, floorIndex) => ({
            number: floorIndex + 1,
            kind: 'residential' as const,
            customized: false,
          }))

      return {
        key: String(tower.id ?? `tower-${index}`),
        id: tower.id,
        name: tower.name,
        referenceFloor: tower.reference_floor ?? null,
        floors: metas.map((meta) => {
          const existing = uniqueUnits
            .filter((unit) => unit.floor === meta.number)
            .toSorted((left, right) => left.code.localeCompare(right.code, undefined, { numeric: true }))

          return {
            number: meta.number,
            kind: meta.kind,
            customized: meta.customized ?? false,
            units:
              existing.length > 0
                ? existing.map((unit, unitIndex) => unitFromApi(unit, meta.number, unitIndex))
                : [emptyUnit(meta.number, 1)],
          }
        }),
      }
    })
}

function unitFromApi(unit: Unit, floorNumber: number, index: number): StackUnit {
  return {
    key: String(unit.id ?? `u-${floorNumber}-${index + 1}`),
    code: unit.code,
    areaM2: displayNumber(unit.private_area_m2 ?? unit.area_m2),
    bedrooms: unit.bedrooms != null ? String(unit.bedrooms) : '',
    bathrooms: unit.bathrooms != null ? String(unit.bathrooms) : '',
    priceBase: displayNumber(unit.price_base ?? unit.price),
    priceCompetence: displayCompetence(unit.price_competence),
  }
}

function displayNumber(value: string | number | null | undefined): string {
  if (value == null || value === '') {
    return ''
  }

  return String(value)
}

function displayCompetence(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  return value.slice(0, 7)
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
