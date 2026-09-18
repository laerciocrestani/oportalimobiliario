import { describe, expect, it } from 'vitest'
import {
  buildSkeleton,
  cloneMirror,
  markException,
  resetFloor,
  structurePayload,
  unitCode,
  unitGridPayload,
  type StackTower,
  type StackUnit,
} from '@/apps/builder/lib/floor-stack'

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

  it('builds a skeleton with garage basements, ground shops and residential floors', () => {
    const [tower] = buildSkeleton({
      towerCount: 1,
      floorsAbove: 3,
      basementCount: 2,
      unitsPerFloor: 2,
      spotsPerBasement: 3,
    })

    expect(tower.name).toBe('Torre A')
    expect(tower.referenceFloor).toBe(1)
    expect(tower.floors.map((item) => [item.number, item.kind, item.customized, item.units.length])).toEqual([
      [-2, 'garage', false, 3],
      [-1, 'garage', false, 3],
      [0, 'commercial', false, 2],
      [1, 'residential', false, 2],
      [2, 'residential', false, 2],
      [3, 'residential', false, 2],
    ])
    expect(floor(tower, 1).units.map((unit) => unit.code)).toEqual(['101', '102'])
    expect(floor(tower, 0).units.map((unit) => unit.code)).toEqual(['L01', 'L02'])
    expect(floor(tower, -1).units.map((unit) => unit.code)).toEqual(['S1-01', 'S1-02', 'S1-03'])
  })

  it('clones the mirror floor to a range above without touching other kinds', () => {
    const source = withUnits(
      buildSkeleton({ towerCount: 1, floorsAbove: 4, basementCount: 1, unitsPerFloor: 2 })[0],
      1,
      [
        { areaM2: '50', bedrooms: '2', bathrooms: '1', priceBase: '320000', priceCompetence: '2026-08' },
        { areaM2: '44.9', bedrooms: '1', bathrooms: '1', priceBase: '280000', priceCompetence: '2026-08' },
      ],
    )
    const cloned = cloneMirror(source, 1, { direction: 'up', from: 2, to: 4 })

    expect(cloned.referenceFloor).toBe(1)
    expect(floor(cloned, 2).units.map((unit) => [unit.code, unit.areaM2, unit.bedrooms])).toEqual([
      ['201', '50', '2'],
      ['202', '44.9', '1'],
    ])
    expect(floor(cloned, 4).units.map((unit) => unit.code)).toEqual(['401', '402'])
    expect(floor(cloned, 0).units.map((unit) => unit.code)).toEqual(['L01', 'L02'])
    expect(floor(cloned, -1).units.map((unit) => unit.code)).toEqual(['S1-01', 'S1-02'])
    expect(floor(source, 2).units[0].areaM2).toBe('')
  })

  it('clones the mirror floor to a range below', () => {
    const source = withUnits(
      buildSkeleton({ towerCount: 1, floorsAbove: 4, basementCount: 0, unitsPerFloor: 1 })[0],
      4,
      [{ areaM2: '72.5', bedrooms: '3', bathrooms: '2' }],
    )
    const cloned = cloneMirror(source, 4, { direction: 'down', from: 2, to: 3 })

    expect(floor(cloned, 3).units[0]).toMatchObject({ code: '301', areaM2: '72.5', bedrooms: '3' })
    expect(floor(cloned, 2).units[0]).toMatchObject({ code: '201', areaM2: '72.5' })
    expect(floor(cloned, 1).units[0].areaM2).toBe('')
  })

  it('preserves customized floors when recloning the same range', () => {
    const source = withUnits(
      buildSkeleton({ towerCount: 1, floorsAbove: 3, basementCount: 0, unitsPerFloor: 1 })[0],
      1,
      [{ areaM2: '50' }],
    )
    const first = cloneMirror(source, 1, { direction: 'up', from: 2, to: 3 })
    const exceptional = markException(
      withUnits(first, 2, [{ areaM2: '61', bedrooms: '3' }]),
      2,
    )
    const recloned = cloneMirror(
      withUnits(exceptional, 1, [{ areaM2: '55' }]),
      1,
      { direction: 'up', from: 2, to: 3 },
    )

    expect(floor(recloned, 2)).toMatchObject({ customized: true })
    expect(floor(recloned, 2).units[0]).toMatchObject({ code: '201', areaM2: '61', bedrooms: '3' })
    expect(floor(recloned, 3).customized).toBe(false)
    expect(floor(recloned, 3).units[0]).toMatchObject({ code: '301', areaM2: '55' })
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
    expect(floor(cloned, 1).units[0].areaM2).toBe('')
  })

  it('resets an exception by reapplying the reference floor', () => {
    const source = withUnits(
      buildSkeleton({ towerCount: 1, floorsAbove: 2, basementCount: 0, unitsPerFloor: 1 })[0],
      1,
      [{ areaM2: '50', bedrooms: '2' }],
    )
    const cloned = cloneMirror(source, 1, { direction: 'up', from: 2, to: 2 })
    const exceptional = markException(withUnits(cloned, 2, [{ areaM2: '90' }]), 2)
    const reset = resetFloor(exceptional, 2)

    expect(floor(reset, 2).customized).toBe(false)
    expect(floor(reset, 2).units[0]).toMatchObject({ code: '201', areaM2: '50', bedrooms: '2' })
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
      ...withUnits(withUnits(draft, 0, [{ areaM2: '38', bedrooms: '0', bathrooms: '1', priceBase: '210000' }]), -1, [
        { areaM2: '12.5', priceBase: '45000', priceCompetence: '2026-08' },
      ]),
      id: 10,
      referenceFloor: 1,
    }

    expect(structurePayload([tower])).toEqual({
      towers: [
        {
          name: 'Torre A',
          reference_floor: 1,
          floors: [
            { number: -1, kind: 'garage' },
            { number: 0, kind: 'commercial' },
            { number: 1, kind: 'residential' },
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
              customized: false,
              units: [
                {
                  code: 'S1-01',
                  private_area_m2: 12.5,
                  bedrooms: null,
                  bathrooms: null,
                  price_base: 45000,
                  price_competence: '2026-08-01',
                },
              ],
            },
            {
              number: 0,
              kind: 'commercial',
              customized: false,
              units: [
                {
                  code: 'L01',
                  private_area_m2: 38,
                  bedrooms: 0,
                  bathrooms: 1,
                  price_base: 210000,
                  price_competence: null,
                },
              ],
            },
            {
              number: 1,
              kind: 'residential',
              customized: false,
              units: [
                {
                  code: '101',
                  private_area_m2: null,
                  bedrooms: null,
                  bathrooms: null,
                  price_base: null,
                  price_competence: null,
                },
              ],
            },
          ],
        },
      ],
    })
  })
})
