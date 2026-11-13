import type { Building, BuildingStructurePayload, BuildingUnitGridPayload, FloorKind, FloorUnitType, Unit } from '@/lib/api'

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
  suites: string
  powderRooms: string
  balconies: string
  priceBase: string
  priceCompetence: string
  propertyPosition: string
  solarPosition: string
  sunPeriod: string
  ceilingType: string
  openingType: string
  flooringType: string
  status?: string
}

export type StackFloor = {
  number: number
  kind: FloorKind
  unitType?: FloorUnitType | null
  customized: boolean
  units: StackUnit[]
}

export type StackTower = {
  key: string
  id?: string
  name: string
  referenceFloor: number | null
  floors: StackFloor[]
  locked?: boolean
}

export const TOP_FLOOR_UNIT_TYPES = [
  'penthouse',
  'duplex',
  'triplex',
  'garden',
  'loft',
  'studio',
  'flat',
  'apartment',
] as const satisfies readonly FloorUnitType[]

const UNIT_TYPE_LABELS: Record<FloorUnitType, string> = {
  apartment: 'Apartamento',
  penthouse: 'Cobertura',
  duplex: 'Duplex',
  triplex: 'Triplex',
  garden: 'Garden',
  loft: 'Loft',
  studio: 'Studio',
  flat: 'Flat',
  store: 'Loja',
}

export function floorUnitTypeLabel(type: FloorUnitType): string {
  return UNIT_TYPE_LABELS[type]
}

export function floorPurposeOptions(
  number: number,
  floors: Array<{ number: number; kind: FloorKind }> = [],
): Array<'hall' | 'residential' | 'commercial' | 'garage'> {
  if (number === 1) {
    return ['hall', 'residential', 'commercial']
  }

  const aboveHall = floors.some((floor) => floor.kind === 'hall' && floor.number === number - 1)

  if (aboveHall) {
    return ['residential', 'commercial', 'garage']
  }

  return ['residential', 'commercial']
}

export function floorUnitTypeOptions(kind: FloorKind, isTop: boolean): FloorUnitType[] {
  if (kind === 'commercial') {
    return ['store']
  }

  if (kind !== 'residential') {
    return []
  }

  return isTop ? [...TOP_FLOOR_UNIT_TYPES] : ['apartment']
}

export function isTopFloor(floors: Array<{ number: number }>, number: number): boolean {
  const highest = floors.reduce((max, floor) => Math.max(max, floor.number), number)

  return number > 0 && number === highest
}

export const DEFAULT_UNITS_PER_FLOOR = 4

export const DEFAULT_SKELETON: SkeletonInput = {
  towerCount: 1,
  floorsAbove: 5,
  basementCount: 2,
  unitsPerFloor: DEFAULT_UNITS_PER_FLOOR,
  spotsPerBasement: 10,
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

export function removeUnit(tower: StackTower, floorNumber: number, unitKey: string): StackTower {
  return markException(
    {
      ...tower,
      floors: tower.floors.map((floor) => {
        if (floor.number !== floorNumber) {
          return floor
        }

        if (floor.kind !== 'hall' && floor.units.length <= 1) {
          return floor
        }

        return {
          ...floor,
          units: floor.units.filter((unit) => unit.key !== unitKey),
        }
      }),
    },
    floorNumber,
  )
}

export function removeFloor(tower: StackTower, floorNumber: number): StackTower {
  if (tower.floors.length <= 1) {
    return tower
  }

  const floors = tower.floors.filter((floor) => floor.number !== floorNumber)
  const referenceFloor =
    tower.referenceFloor === floorNumber ? (floors[floors.length - 1]?.number ?? null) : tower.referenceFloor

  return {
    ...tower,
    referenceFloor,
    floors,
  }
}

export function duplicateUnit(tower: StackTower, floorNumber: number, unitKey: string): StackTower {
  return markException(
    {
      ...tower,
      floors: tower.floors.map((floor) => {
        if (floor.number !== floorNumber || floor.kind === 'hall') {
          return floor
        }

        const source = floor.units.find((unit) => unit.key === unitKey)

        if (!source) {
          return floor
        }

        const position = floor.units.length + 1

        return {
          ...floor,
          units: [
            ...floor.units,
            {
              ...source,
              key: draftKey(`u-${floor.number}-${position}`),
              code: unitCode(floor.number, position),
            },
          ],
        }
      }),
    },
    floorNumber,
  )
}

export function duplicateFloor(tower: StackTower, floorNumber: number, direction: 'above' | 'below'): StackTower {
  const source = tower.floors.find((floor) => floor.number === floorNumber)

  if (!source) {
    return tower
  }

  const insertAt = duplicateFloorInsertNumber(floorNumber, direction)

  function movedNumber(number: number): number {
    if (direction === 'below' && floorNumber < 0) {
      return number <= insertAt ? number - 1 : number
    }

    return number >= insertAt ? nextFloorNumber(number, 1) : number
  }

  const moved = tower.floors.map((floor) => renumberFloor(floor, movedNumber(floor.number)))

  return {
    ...tower,
    referenceFloor: tower.referenceFloor == null ? null : movedNumber(tower.referenceFloor),
    floors: settleTopFloorTypes([...moved, cloneFloorAt(source, insertAt)]).toSorted(
      (left, right) => left.number - right.number,
    ),
  }
}

export function duplicateFloorInsertNumber(floorNumber: number, direction: 'above' | 'below'): number {
  if (direction === 'above') {
    return nextFloorNumber(floorNumber, 1)
  }

  if (floorNumber < 0) {
    return floorNumber - 1
  }

  return floorNumber
}

export function setReferenceFloor(tower: StackTower, floorNumber: number): StackTower {
  if (!tower.floors.some((floor) => floor.number === floorNumber) || tower.referenceFloor === floorNumber) {
    return tower
  }

  return {
    ...tower,
    referenceFloor: floorNumber,
  }
}

export function addFloor(tower: StackTower, where: 'above' | 'basement'): StackTower {
  if (where === 'basement') {
    const lowest = tower.floors.reduce((min, floor) => Math.min(min, floor.number), 0)
    const number = lowest > 0 ? -1 : lowest - 1
    const spots = tower.floors.find((floor) => floor.kind === 'garage')?.units.length ?? 1

    return {
      ...tower,
      floors: [...tower.floors, makeFloor(number, 'garage', Math.max(1, spots))].toSorted(
        (left, right) => left.number - right.number,
      ),
    }
  }

  const highest = tower.floors.reduce((max, floor) => Math.max(max, floor.number), 0)
  const number = highest < 1 ? 1 : highest + 1

  if (number === 1) {
    return {
      ...tower,
      floors: [...tower.floors, makeFloor(1, 'hall', 0)].toSorted((left, right) => left.number - right.number),
    }
  }

  const sample =
    tower.floors.find((floor) => floor.number === tower.referenceFloor && floor.kind === 'residential') ??
    tower.floors.find((floor) => floor.kind === 'residential')
  const count = Math.max(1, sample?.units.length ?? 1)
  const floors = tower.floors.map((floor) => {
    if (floor.number !== highest || floor.unitType == null || floor.unitType === 'apartment' || floor.unitType === 'store') {
      return floor
    }

    return { ...floor, unitType: 'apartment' as const }
  })

  return {
    ...tower,
    floors: [...floors, makeFloor(number, 'residential', count, 'apartment')].toSorted(
      (left, right) => left.number - right.number,
    ),
  }
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

    floors.push(makeFloor(1, 'hall', 0))

    for (let number = 2; number <= floorsAbove + 1; number += 1) {
      floors.push(makeFloor(number, 'residential', unitsPerFloor, 'apartment'))
    }

    return {
      key: draftKey(`tower-${index}`),
      name: `Torre ${String.fromCharCode(65 + (index % 26))}`,
      referenceFloor: floorsAbove > 0 ? 2 : 1,
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
  if (number > 1) {
    return `${number}º pavimento`
  }

  if (number === 1) {
    return '1 pavimento (térreo)'
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

  if (kind === 'hall') {
    return 'Hall'
  }

  return 'Residencial'
}

export function setFloorPurpose(
  tower: StackTower,
  floorNumber: number,
  kind: 'hall' | 'residential' | 'commercial' | 'garage',
): StackTower {
  const next = setFloorKind(tower, floorNumber, kind)
  const top = isTopFloor(next.floors, floorNumber)

  return {
    ...next,
    floors: next.floors.map((floor) => {
      if (floor.number !== floorNumber) {
        return floor
      }

      if (kind === 'hall' || kind === 'garage') {
        return { ...floor, unitType: null }
      }

      if (kind === 'commercial') {
        return { ...floor, unitType: 'store' }
      }

      const allowed = floorUnitTypeOptions('residential', top)

      return {
        ...floor,
        unitType: floor.unitType != null && allowed.includes(floor.unitType) ? floor.unitType : 'apartment',
      }
    }),
  }
}

export function setFloorUnitType(tower: StackTower, floorNumber: number, unitType: FloorUnitType): StackTower {
  const current = tower.floors.find((floor) => floor.number === floorNumber)

  if (!current || floorUnitTypeOptions(current.kind === 'hall' ? 'residential' : current.kind, isTopFloor(tower.floors, floorNumber)).includes(unitType) === false) {
    return tower
  }

  const kind = unitType === 'store' ? 'commercial' : 'residential'
  const withKind = current.kind === kind ? tower : setFloorKind(tower, floorNumber, kind)

  return markException(
    {
      ...withKind,
      floors: withKind.floors.map((floor) => (floor.number === floorNumber ? { ...floor, kind, unitType } : floor)),
    },
    floorNumber,
  )
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
          (floor) =>
            (floor.kind === 'hall' || floor.units.length >= 1) &&
            floor.units.every((unit) => unit.code.trim() !== ''),
        ),
    )
  )
}

export function setFloorKind(tower: StackTower, floorNumber: number, kind: FloorKind): StackTower {
  return markException(
    {
      ...tower,
      floors: tower.floors.map((floor) => {
        if (floor.number !== floorNumber || floor.kind === kind) {
          return floor
        }

        if (kind === 'hall') {
          return { ...floor, kind, units: [] }
        }

        if (floor.units.length === 0) {
          return { ...floor, kind, units: [emptyUnit(floor.number, 1)] }
        }

        return { ...floor, kind }
      }),
    },
    floorNumber,
  )
}

export function resizeFloorUnits(tower: StackTower, floorNumber: number, count: number): StackTower {
  return markException(
    {
      ...tower,
      floors: tower.floors.map((floor) => {
        if (floor.number !== floorNumber || floor.kind === 'hall') {
          return floor
        }

        const nextCount = Math.max(1, count)

        if (nextCount === floor.units.length) {
          return floor
        }

        if (nextCount < floor.units.length) {
          return { ...floor, units: floor.units.slice(0, nextCount) }
        }

        const added = Array.from({ length: nextCount - floor.units.length }, (_, index) =>
          emptyUnit(floor.number, floor.units.length + index + 1),
        )

        return { ...floor, units: [...floor.units, ...added] }
      }),
    },
    floorNumber,
  )
}

export type ClonePreviewRow = {
  number: number
  codes: string
  situation: 'Cópia' | 'Exceção' | 'Outro tipo'
}

export function clonePreview(tower: StackTower, referenceNumber: number, range: CloneRange): ClonePreviewRow[] {
  const reference = tower.floors.find((item) => item.number === referenceNumber)

  if (!reference) {
    return []
  }

  return tower.floors
    .filter((item) => inCloneRange(item.number, referenceNumber, range))
    .toSorted((left, right) => right.number - left.number)
    .map((item) => {
      if (item.kind !== reference.kind) {
        return { number: item.number, codes: '—', situation: 'Outro tipo' as const }
      }

      if (item.customized) {
        return {
          number: item.number,
          codes: item.units.map((unit) => unit.code).join(', ') || '—',
          situation: 'Exceção' as const,
        }
      }

      return {
        number: item.number,
        codes: copyUnitsToFloor(reference.units, item.number)
          .map((unit) => unit.code)
          .join(', '),
        situation: 'Cópia' as const,
      }
    })
}

export function applySavedTowerIds(stack: StackTower[], saved: Building): StackTower[] {
  const savedTowers = saved.towers ?? []

  return stack.map((tower, index) => {
    const match = (tower.id ? savedTowers.find((item) => item.id === tower.id) : undefined)
      ?? savedTowers.find((item) => item.name === tower.name)
      ?? savedTowers[index]

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
    .filter((tower) => tower.id.length > 0)
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
        locked: towerHasReference(uniqueUnits),
        floors: metas.map((meta) => {
          const existing = uniqueUnits
            .filter((unit) => unit.floor === meta.number)
            .toSorted((left, right) => left.code.localeCompare(right.code, undefined, { numeric: true }))

          return {
            number: meta.number,
            kind: meta.kind,
            unitType: 'unit_type' in meta ? (meta.unit_type ?? null) : null,
            customized: meta.customized ?? false,
            units:
              existing.length > 0
                ? existing.map((unit, unitIndex) => unitFromApi(unit, meta.number, unitIndex))
                : meta.kind === 'hall'
                  ? []
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
    suites: unit.suites != null ? String(unit.suites) : '',
    powderRooms: unit.powder_rooms != null ? String(unit.powder_rooms) : '',
    balconies: unit.balconies != null ? String(unit.balconies) : '',
    priceBase: displayNumber(unit.price_base ?? unit.price),
    priceCompetence: displayCompetence(unit.price_competence),
    propertyPosition: unit.property_position ?? '',
    solarPosition: unit.solar_position ?? '',
    sunPeriod: unit.sun_period ?? '',
    ceilingType: unit.ceiling_type ?? '',
    openingType: unit.opening_type ?? '',
    flooringType: unit.flooring_type ?? '',
    status: unit.status,
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

export function towerHasReference(units: Array<{ status?: string | null; reservation?: unknown }>): boolean {
  return units.some((unit) => unit.status === 'sold' || unit.reservation != null)
}

export function towerLetterName(index: number): string {
  if (index >= 0 && index < 26) {
    return `Torre ${String.fromCharCode(65 + index)}`
  }

  return `Torre ${index + 1}`
}

export function buildEntranceHall(): StackTower {
  return {
    key: draftKey('tower'),
    name: towerLetterName(0),
    referenceFloor: 1,
    floors: [
      {
        number: 1,
        kind: 'hall',
        customized: false,
        units: [],
      },
    ],
  }
}

export function copyTowerFromPrevious(towers: StackTower[]): StackTower[] {
  const source = towers[towers.length - 1]

  if (!source) {
    return towers
  }

  return [...towers, duplicateTower(source, towerLetterName(towers.length))]
}

export function appendTower(
  towers: StackTower[],
  input: { name: string; source?: StackTower; skeleton: SkeletonInput },
): StackTower[] {
  const name = input.name.trim()

  if (name === '') {
    return towers
  }

  if (input.source) {
    return [...towers, duplicateTower(input.source, name)]
  }

  const [created] = buildSkeleton({ ...input.skeleton, towerCount: 1 })

  if (!created) {
    return towers
  }

  return [...towers, { ...created, name }]
}

function duplicateTower(source: StackTower, name: string): StackTower {
  return {
    key: draftKey('tower'),
    name,
    referenceFloor: source.referenceFloor,
    floors: source.floors.map((floor) => ({
      ...floor,
      units: floor.units.map((unit) => ({
        ...unit,
        key: draftKey(`u-${floor.number}`),
      })),
    })),
  }
}

export function structurePayload(towers: StackTower[]): BuildingStructurePayload {
  return {
    towers: towers.map((tower) => ({
      ...(tower.id ? { id: tower.id } : {}),
      name: tower.name,
      reference_floor: tower.referenceFloor,
      floors: tower.floors.map((item) => ({
        number: item.number,
        kind: item.kind,
        unit_type: payloadUnitType(item),
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
            unit_type: payloadUnitType(item),
            customized: item.customized,
            units: item.units.map((unit) => ({
              code: unit.code.trim(),
              private_area_m2: parseNumber(unit.areaM2),
              bedrooms: parseOptionalInt(unit.bedrooms),
              bathrooms: parseOptionalInt(unit.bathrooms),
              suites: parseOptionalInt(unit.suites),
              powder_rooms: parseOptionalInt(unit.powderRooms),
              balconies: parseOptionalInt(unit.balconies),
              price_base: parseNumber(unit.priceBase),
              price_competence: parseCompetence(unit.priceCompetence),
              property_position: blankText(unit.propertyPosition),
              solar_position: blankText(unit.solarPosition),
              sun_period: blankText(unit.sunPeriod),
              ceiling_type: blankText(unit.ceilingType),
              opening_type: blankText(unit.openingType),
              flooring_type: blankText(unit.flooringType),
            })),
          })),
        },
      ]
    }),
  }
}

function payloadUnitType(floor: StackFloor): FloorUnitType | null {
  if (floor.kind === 'hall' || floor.kind === 'garage') {
    return null
  }

  if (floor.unitType) {
    return floor.unitType
  }

  return floor.kind === 'commercial' ? 'store' : 'apartment'
}

function makeFloor(number: number, kind: FloorKind, unitCount: number, unitType?: FloorUnitType | null): StackFloor {
  return {
    number,
    kind,
    unitType: unitType ?? (kind === 'residential' ? 'apartment' : kind === 'commercial' ? 'store' : null),
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
    suites: '',
    powderRooms: '',
    balconies: '',
    priceBase: '',
    priceCompetence: '',
    propertyPosition: '',
    solarPosition: '',
    sunPeriod: '',
    ceilingType: '',
    openingType: '',
    flooringType: '',
  }
}

function copyUnitsToFloor(units: StackUnit[], floorNumber: number): StackUnit[] {
  return units.map((unit, index) => ({
    ...unit,
    key: draftKey(`u-${floorNumber}-${index + 1}`),
    code: unitCode(floorNumber, index + 1),
  }))
}

function nextFloorNumber(number: number, delta: 1 | -1): number {
  const next = number + delta

  if (next === 0) {
    return delta > 0 ? 1 : -1
  }

  return next
}

function renumberFloor(floor: StackFloor, number: number): StackFloor {
  if (floor.number === number) {
    return floor
  }

  return {
    ...floor,
    number,
    units: floor.units.map((unit, index) => ({
      ...unit,
      code: unitCode(number, index + 1),
    })),
  }
}

function cloneFloorAt(source: StackFloor, number: number): StackFloor {
  return {
    number,
    kind: source.kind,
    unitType: source.unitType ?? null,
    customized: true,
    units: copyUnitsToFloor(source.units, number),
  }
}

function settleTopFloorTypes(floors: StackFloor[]): StackFloor[] {
  const highest = floors.reduce((max, floor) => Math.max(max, floor.number), Number.NEGATIVE_INFINITY)
  const topOnly = new Set<FloorUnitType>(['penthouse', 'duplex', 'triplex', 'garden', 'loft', 'studio', 'flat'])

  return floors.map((floor) => {
    if (floor.number === highest || floor.unitType == null || !topOnly.has(floor.unitType)) {
      return floor
    }

    return { ...floor, unitType: 'apartment' }
  })
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

function blankText(value: string): string | null {
  const trimmed = value.trim()

  return trimmed === '' ? null : trimmed
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
