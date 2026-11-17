import { describe, expect, it } from 'vitest'
import {
  appendTower,
  buildEntranceHall,
  buildSkeleton,
  cloneMirror,
  copyTowerFromPrevious,
  DEFAULT_SKELETON,
  floorPurposeOptions,
  isBelowEntranceHall,
  normalizeFloorsBelowHall,
  addFloor,
  floorUnitTypeOptions,
  setFloorPurpose,
  setFloorUnitType,
  stacksFromBuilding,
  towerHasReference,
  markException,
  mirrorDraftFromTower,
  resetFloor,
  setReferenceFloor,
  structurePayload,
  unitCode,
  unitGridPayload,
  duplicateFloor,
  duplicateUnit,
  unitCharacteristics,
  type StackTower,
  type StackUnit,
} from '@/apps/builder/lib/floor-stack'
import type { Building } from '@/lib/api'

function withUnits(tower: StackTower, floorNumber: number, patch: Array<Partial<StackUnit>>): StackTower {
  return {
    ...tower,
    floors: tower.floors.map((floor) =>
      floor.number !== floorNumber
        ? floor
        : {
            ...floor,
            units: floor.units.map((unit, index) => ({ ...unit, ...patch[index] })),
          },
    ),
  }
}

function floor(tower: StackTower, number: number) {
  const found = tower.floors.find((item) => item.number === number)

  if (!found) {
    throw new Error(`Floor ${number} not found`)
  }

  return found
}

describe('floor-stack', () => {
  it('builds 101, L01 and S1-01 codes from floor and position', () => {
    expect(unitCode(1, 1)).toBe('101')
    expect(unitCode(2, 3)).toBe('203')
    expect(unitCode(10, 1)).toBe('1001')
    expect(unitCode(0, 1)).toBe('L01')
    expect(unitCode(0, 12)).toBe('L12')
    expect(unitCode(-1, 1)).toBe('S1-01')
    expect(unitCode(-2, 3)).toBe('S2-03')
  })

  it('starts with five floors, two basements and one unit per floor', () => {
    expect(DEFAULT_SKELETON).toMatchObject({
      floorsAbove: 5,
      basementCount: 2,
      unitsPerFloor: 1,
      spotsPerBasement: 1,
    })
  })

  it('builds a skeleton with garage basements, ground shops and residential floors', () => {
    const [tower] = buildSkeleton({
      towerCount: 1,
      floorsAbove: 3,
      basementCount: 2,
      unitsPerFloor: 2,
      spotsPerBasement: 3,
    })

    expect(tower.name).toBe('Torre A')
    expect(tower.referenceFloor).toBe(2)
    expect(tower.floors.map((item) => [item.number, item.kind, item.customized, item.units.length])).toEqual([
      [-2, 'garage', false, 3],
      [-1, 'garage', false, 3],
      [1, 'hall', false, 0],
      [2, 'residential', false, 2],
      [3, 'residential', false, 2],
      [4, 'residential', false, 2],
    ])
    expect(floor(tower, 2).units.map((unit) => unit.code)).toEqual(['201', '202'])
    expect(floor(tower, 1).units).toEqual([])
    expect(floor(tower, -1).units.map((unit) => unit.code)).toEqual(['S1-01', 'S1-02', 'S1-03'])
  })

  it('defaults the clone range to the remaining floors of the same kind', () => {
    const [tower] = buildSkeleton({
      towerCount: 1,
      floorsAbove: 3,
      basementCount: 2,
      unitsPerFloor: 1,
    })

    expect(mirrorDraftFromTower(tower)).toEqual({
      referenceNumber: 2,
      direction: 'up',
      from: 3,
      to: 4,
    })
    expect(mirrorDraftFromTower({ ...tower, referenceFloor: -1 })).toEqual({
      referenceNumber: -1,
      direction: 'down',
      from: -2,
      to: -2,
    })
  })

  it('changes the model floor without copying units', () => {
    const tower = buildSkeleton({ towerCount: 1, floorsAbove: 2, basementCount: 0, unitsPerFloor: 1 })[0]
    const next = setReferenceFloor(tower, 2)

    expect(next.referenceFloor).toBe(2)
    expect(next.floors).toBe(tower.floors)
    expect(setReferenceFloor(tower, 9)).toBe(tower)
  })

  it('copies the previous tower with the next letter and new keys', () => {
    const source = buildSkeleton({ towerCount: 1, floorsAbove: 1, basementCount: 0, unitsPerFloor: 1 })[0]
    source.id = 'tower-1'
    source.name = 'Torre A'
    const [kept, copy] = copyTowerFromPrevious([source])

    expect(kept).toBe(source)
    expect(copy.name).toBe('Torre B')
    expect(copy.id).toBeUndefined()
    expect(copy.floors).toHaveLength(source.floors.length)
    expect(floor(copy, 2).units[0].key).not.toBe(floor(source, 2).units[0].key)
    expect(floor(copy, 2).units[0].code).toBe(floor(source, 2).units[0].code)
    expect(structurePayload([source, copy]).towers[0].id).toBe('tower-1')
    expect(structurePayload([source, copy]).towers[1].id).toBeUndefined()
    expect(towerHasReference([{ status: 'available' }])).toBe(false)
    expect(towerHasReference([{ status: 'sold' }])).toBe(true)
    expect(towerHasReference([{ status: 'available', reservation: { id: 1 } }])).toBe(true)
  })

  it('appends a named clone or a fresh tower from the skeleton', () => {
    const source = withUnits(
      buildSkeleton({ towerCount: 1, floorsAbove: 1, basementCount: 0, unitsPerFloor: 1 })[0],
      2,
      [{ areaM2: '88' }],
    )
    source.id = 'tower-1'
    source.name = 'Torre A'
    const sourceUnitKey = floor(source, 2).units[0].key

    const cloned = appendTower([source], { name: '  Torre Norte  ', source, skeleton: DEFAULT_SKELETON })

    expect(cloned).toHaveLength(2)
    expect(cloned[0]).toBe(source)
    expect(cloned[1].name).toBe('Torre Norte')
    expect(cloned[1].id).toBeUndefined()
    expect(floor(cloned[1], 2).units[0].areaM2).toBe('88')
    expect(floor(cloned[1], 2).units[0].key).not.toBe(sourceUnitKey)

    const fresh = appendTower([source], {
      name: 'Torre Sul',
      skeleton: { ...DEFAULT_SKELETON, floorsAbove: 2, basementCount: 0, unitsPerFloor: 1 },
    })

    expect(fresh[1].name).toBe('Torre Sul')
    expect(fresh[1].floors.map((item) => item.number)).toEqual([1, 2, 3])
    expect(floor(fresh[1], 2).units[0].areaM2).toBe('')

    const unchanged = [source]
    expect(appendTower(unchanged, { name: '   ', skeleton: DEFAULT_SKELETON })).toBe(unchanged)
  })

  it('duplicates a unit and inserts a copy of the floor above or below', () => {
    const [skeleton] = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 2, basementCount: 1, unitsPerFloor: 1 })
    const tower = withUnits(skeleton, 2, [{ areaM2: '41.41', bedrooms: '2' }])
    const source = floor(tower, 2).units[0]
    const duplicated = duplicateUnit(tower, 2, source.key)

    expect(floor(duplicated, 2).customized).toBe(true)
    expect(floor(duplicated, 2).units.map((unit) => [unit.code, unit.areaM2, unit.bedrooms])).toEqual([
      ['201', '41.41', '2'],
      ['202', '41.41', '2'],
    ])
    expect(floor(duplicated, 2).units[1].key).not.toBe(source.key)

    const above = duplicateFloor(tower, 2, 'above')

    expect(above.floors.map((item) => item.number)).toEqual([-1, 1, 2, 3, 4])
    expect(floor(above, 3).units[0]).toMatchObject({ code: '301', areaM2: '41.41' })
    expect(floor(above, 2).units[0].code).toBe('201')
    expect(above.referenceFloor).toBe(2)

    const below = duplicateFloor(tower, 2, 'below')

    expect(below.floors.map((item) => item.number)).toEqual([-1, 1, 2, 3, 4])
    expect(floor(below, 2).units[0]).toMatchObject({ code: '201', areaM2: '41.41' })
    expect(floor(below, 3).units[0].code).toBe('301')
    expect(below.referenceFloor).toBe(3)

    const deeper = duplicateFloor(tower, -1, 'below')

    expect(deeper.floors.map((item) => item.number)).toEqual([-2, -1, 1, 2, 3])
    expect(floor(deeper, -2).kind).toBe('garage')
    expect(floor(deeper, -2).units[0].code).toBe('S2-01')
  })

  it('copies every unit characteristic and keeps identity out of the clipboard', () => {
    const [skeleton] = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, basementCount: 0, unitsPerFloor: 1 })
    const source = {
      ...floor(skeleton, 2).units[0],
      areaM2: '41.41',
      bedrooms: '2',
      status: 'available',
      futureField: 'varanda',
    }
    const copied = unitCharacteristics(source)

    expect(copied).toMatchObject({ areaM2: '41.41', bedrooms: '2', futureField: 'varanda' })
    expect(copied).not.toHaveProperty('key')
    expect(copied).not.toHaveProperty('code')
    expect(copied).not.toHaveProperty('status')
  })

  it('offers garage on every floor except the hall and the floors below it', () => {
    const floors = [
      { number: -2, kind: 'garage' as const },
      { number: -1, kind: 'residential' as const },
      { number: 1, kind: 'hall' as const },
      { number: 2, kind: 'residential' as const },
      { number: 3, kind: 'commercial' as const },
    ]

    expect(isBelowEntranceHall(-1, floors)).toBe(true)
    expect(isBelowEntranceHall(0, floors)).toBe(true)
    expect(isBelowEntranceHall(1, floors)).toBe(false)
    expect(isBelowEntranceHall(2, floors)).toBe(false)
    expect(isBelowEntranceHall(-1, [{ number: 0, kind: 'hall' }])).toBe(true)
    expect(isBelowEntranceHall(1, [{ number: 0, kind: 'hall' }])).toBe(false)
    expect(isBelowEntranceHall(0, [{ number: 0, kind: 'commercial' }, { number: 1, kind: 'residential' }])).toBe(false)
    expect(floorPurposeOptions(1, floors)).toEqual(['hall', 'residential', 'commercial'])
    expect(floorPurposeOptions(-1, floors)).toEqual([])
    expect(floorPurposeOptions(-2, floors)).toEqual([])
    expect(floorPurposeOptions(0, floors)).toEqual([])
    expect(floorPurposeOptions(2, floors)).toEqual(['residential', 'commercial', 'garage'])
    expect(floorPurposeOptions(3, floors)).toEqual(['residential', 'commercial', 'garage'])
    expect(floorPurposeOptions(1, [{ number: 1, kind: 'residential' }])).toEqual([
      'hall',
      'residential',
      'commercial',
      'garage',
    ])
  })

  it('turns floors below the entrance hall into garage basements', () => {
    const [skeleton] = buildSkeleton({
      ...DEFAULT_SKELETON,
      towerCount: 1,
      floorsAbove: 1,
      basementCount: 1,
      unitsPerFloor: 1,
    })
    const residentialBasement = {
      ...skeleton,
      floors: skeleton.floors.map((item) =>
        item.number === -1 ? { ...item, kind: 'residential' as const, unitType: 'apartment' as const } : item,
      ),
    }

    const normalized = normalizeFloorsBelowHall(residentialBasement)

    expect(floor(normalized, -1).kind).toBe('garage')
    expect(floor(normalized, -1).unitType).toBeNull()
    expect(floor(normalized, -1).units[0].code).toBe('S1-01')
    expect(floor(normalized, 1).kind).toBe('hall')
    expect(floor(normalized, 2).kind).toBe('residential')
    expect(normalizeFloorsBelowHall(normalized)).toBe(normalized)
    expect(setFloorPurpose(residentialBasement, -1, 'commercial').floors.find((item) => item.number === -1)?.kind).toBe(
      'garage',
    )
  })

  it('builds a tower with only the entrance hall', () => {
    const tower = buildEntranceHall()

    expect(tower.name).toBe('Torre A')
    expect(tower.id).toBeUndefined()
    expect(tower.referenceFloor).toBe(1)
    expect(tower.floors).toEqual([
      {
        number: 1,
        kind: 'hall',
        customized: false,
        units: [],
      },
    ])
  })

  it('clones the mirror floor to a range above without touching other kinds', () => {
    const source = withUnits(
      buildSkeleton({ towerCount: 1, floorsAbove: 4, basementCount: 1, unitsPerFloor: 2 })[0],
      2,
      [
        { areaM2: '50', bedrooms: '2', bathrooms: '1', priceBase: '320000', priceCompetence: '2026-08' },
        { areaM2: '44.9', bedrooms: '1', bathrooms: '1', priceBase: '280000', priceCompetence: '2026-08' },
      ],
    )
    const cloned = cloneMirror(source, 2, { direction: 'up', from: 3, to: 5 })

    expect(cloned.referenceFloor).toBe(2)
    expect(floor(cloned, 3).units.map((unit) => [unit.code, unit.areaM2, unit.bedrooms])).toEqual([
      ['301', '50', '2'],
      ['302', '44.9', '1'],
    ])
    expect(floor(cloned, 5).units.map((unit) => unit.code)).toEqual(['501', '502'])
    expect(floor(cloned, 1).units).toEqual([])
    expect(floor(cloned, -1).units.map((unit) => unit.code)).toEqual(['S1-01', 'S1-02'])
    expect(floor(source, 3).units[0].areaM2).toBe('')
  })

  it('clones the mirror floor to a range below', () => {
    const source = withUnits(
      buildSkeleton({ towerCount: 1, floorsAbove: 4, basementCount: 0, unitsPerFloor: 1 })[0],
      5,
      [{ areaM2: '72.5', bedrooms: '3', bathrooms: '2' }],
    )
    const cloned = cloneMirror(source, 5, { direction: 'down', from: 3, to: 4 })

    expect(floor(cloned, 4).units[0]).toMatchObject({ code: '401', areaM2: '72.5', bedrooms: '3' })
    expect(floor(cloned, 3).units[0]).toMatchObject({ code: '301', areaM2: '72.5' })
    expect(floor(cloned, 2).units[0].areaM2).toBe('')
  })

  it('preserves customized floors when recloning the same range', () => {
    const source = withUnits(
      buildSkeleton({ towerCount: 1, floorsAbove: 3, basementCount: 0, unitsPerFloor: 1 })[0],
      2,
      [{ areaM2: '50' }],
    )
    const first = cloneMirror(source, 2, { direction: 'up', from: 3, to: 4 })
    const exceptional = markException(
      withUnits(first, 3, [{ areaM2: '61', bedrooms: '3' }]),
      3,
    )
    const recloned = cloneMirror(
      withUnits(exceptional, 2, [{ areaM2: '55' }]),
      2,
      { direction: 'up', from: 3, to: 4 },
    )

    expect(floor(recloned, 3)).toMatchObject({ customized: true })
    expect(floor(recloned, 3).units[0]).toMatchObject({ code: '301', areaM2: '61', bedrooms: '3' })
    expect(floor(recloned, 4).customized).toBe(false)
    expect(floor(recloned, 4).units[0]).toMatchObject({ code: '401', areaM2: '55' })
  })

  it('clones garage floors between negative numbers', () => {
    const source = withUnits(
      buildSkeleton({
        towerCount: 1,
        floorsAbove: 1,
        basementCount: 3,
        unitsPerFloor: 1,
        spotsPerBasement: 2,
      })[0],
      -1,
      [
        { areaM2: '12.5', priceBase: '45000', priceCompetence: '2026-08' },
        { areaM2: '13', priceBase: '47000', priceCompetence: '2026-08' },
      ],
    )
    const cloned = cloneMirror(source, -1, { direction: 'down', from: -3, to: -2 })

    expect(floor(cloned, -2).units.map((unit) => [unit.code, unit.areaM2, unit.priceBase])).toEqual([
      ['S2-01', '12.5', '45000'],
      ['S2-02', '13', '47000'],
    ])
    expect(floor(cloned, -3).units[0].code).toBe('S3-01')
    expect(floor(cloned, 2).units[0].areaM2).toBe('')
  })

  it('resets an exception by reapplying the reference floor', () => {
    const source = withUnits(
      buildSkeleton({ towerCount: 1, floorsAbove: 2, basementCount: 0, unitsPerFloor: 1 })[0],
      2,
      [{ areaM2: '50', bedrooms: '2' }],
    )
    const cloned = cloneMirror(source, 2, { direction: 'up', from: 3, to: 3 })
    const exceptional = markException(withUnits(cloned, 3, [{ areaM2: '90' }]), 3)
    const reset = resetFloor(exceptional, 3)

    expect(floor(reset, 3).customized).toBe(false)
    expect(floor(reset, 3).units[0]).toMatchObject({ code: '301', areaM2: '50', bedrooms: '2' })
  })

  it('keeps a hall floor empty when the building has no units there', () => {
    const [tower] = stacksFromBuilding({
      towers: [
        {
          id: 'tower-1',
          name: 'Torre A',
          sort_order: 0,
          floors: [
            { id: 'floor-0', tower_id: 'tower-1', number: 0, kind: 'hall' },
            { id: 'floor-1', tower_id: 'tower-1', number: 1, kind: 'residential' },
          ],
          units: [
            {
              id: 'unit-1',
              code: '101',
              floor: 1,
              tower_id: 'tower-1',
              area_m2: null,
              price: null,
              status: 'available',
            },
          ],
        },
      ],
      units: [],
    } as Building)

    expect(tower.floors.find((item) => item.number === 0)?.units).toEqual([])
    expect(tower.floors.find((item) => item.number === 1)?.units.map((unit) => unit.code)).toEqual(['101'])
  })

  it('builds structure and unit-grid payloads compatible with the API', () => {
    const [draft] = buildSkeleton({
      towerCount: 1,
      floorsAbove: 1,
      basementCount: 1,
      unitsPerFloor: 1,
      spotsPerBasement: 1,
    })
    const tower: StackTower = {
      ...withUnits(withUnits(draft, 2, [{ areaM2: '38', bedrooms: '0', bathrooms: '1', priceBase: '210000' }]), -1, [
        { areaM2: '12.5', priceBase: '45000', priceCompetence: '2026-08' },
      ]),
      id: 10,
      referenceFloor: 1,
    }

    expect(structurePayload([tower])).toEqual({
      towers: [
        {
          id: 10,
          name: 'Torre A',
          reference_floor: 1,
          floors: [
            { number: -1, kind: 'garage', unit_type: null },
            { number: 1, kind: 'hall', unit_type: null },
            { number: 2, kind: 'residential', unit_type: 'apartment' },
          ],
        },
      ],
    })
    expect(unitGridPayload([tower])).toEqual({
      towers: [
        {
          id: 10,
          reference_floor: 1,
          floors: [
            {
              number: -1,
              kind: 'garage',
              unit_type: null,
              customized: false,
              units: [
                {
                  code: 'S1-01',
                  private_area_m2: 12.5,
                  bedrooms: null,
                  bathrooms: null,
                  suites: null,
                  powder_rooms: null,
                  balconies: null,
                  price_base: 45000,
                  price_competence: '2026-08-01',
                  property_position: null,
                  solar_position: null,
                  sun_period: null,
                  ceiling_type: null,
                  opening_type: null,
                  flooring_type: null,
                },
              ],
            },
            {
              number: 1,
              kind: 'hall',
              unit_type: null,
              customized: false,
              units: [],
            },
            {
              number: 2,
              kind: 'residential',
              unit_type: 'apartment',
              customized: false,
              units: [
                {
                  code: '201',
                  private_area_m2: 38,
                  bedrooms: 0,
                  bathrooms: 1,
                  suites: null,
                  powder_rooms: null,
                  balconies: null,
                  price_base: 210000,
                  price_competence: null,
                  property_position: null,
                  solar_position: null,
                  sun_period: null,
                  ceiling_type: null,
                  opening_type: null,
                  flooring_type: null,
                },
              ],
            },
          ],
        },
      ],
    })
  })

  it('offers every residential type above the hall and keeps duplex when a floor is added', () => {
    const [tower] = buildSkeleton({
      ...DEFAULT_SKELETON,
      towerCount: 1,
      floorsAbove: 3,
      basementCount: 1,
      unitsPerFloor: 1,
    })

    expect(floorUnitTypeOptions('residential', 2, tower.floors)).toEqual([
      'penthouse',
      'duplex',
      'triplex',
      'garden',
      'loft',
      'studio',
      'flat',
      'apartment',
    ])
    expect(floorUnitTypeOptions('hall', 1, tower.floors)).toEqual([])
    expect(floorUnitTypeOptions('garage', -1, tower.floors)).toEqual([])
    expect(floorUnitTypeOptions('commercial', 0, tower.floors)).toEqual(['store'])

    const withDuplex = setFloorUnitType(tower, 2, 'duplex')

    expect(floor(withDuplex, 2).unitType).toBe('duplex')
    expect(floor(addFloor(withDuplex, 'above'), 2).unitType).toBe('duplex')
    expect(floor(setFloorUnitType(tower, -1, 'duplex'), -1).unitType).not.toBe('duplex')
  })
})
