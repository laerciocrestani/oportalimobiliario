import { describe, expect, it } from 'vitest'
import {
  applyTypicalAreaToMatchingFloors,
  applyTypicalToTower,
  applyUnitSpecToMatchingFloors,
  emptyTypicalSlots,
  typicalPositionHint,
  unitCode,
  unitGridPayload,
  type TowerUnitGrid,
} from '@/apps/builder/lib/unit-grid'

function sampleGrid(): TowerUnitGrid {
  const slots = emptyTypicalSlots(2)

  return applyTypicalToTower(
    {
      towerId: 1,
      name: 'Torre A',
      typicalCount: 2,
      typicalSlots: slots,
      floors: [
        { number: 1, kind: 'residential', units: [] },
        { number: 2, kind: 'residential', units: [] },
        { number: 3, kind: 'residential', units: [] },
      ],
    },
    2,
  )
}

describe('unit-grid', () => {
  it('builds 101, 201, 301 from floor and position', () => {
    expect(unitCode(1, 1)).toBe('101')
    expect(unitCode(2, 1)).toBe('201')
    expect(unitCode(10, 1)).toBe('1001')
    expect(typicalPositionHint([1, 2, 3, 4], 1)).toBe('101, 201, 301…')
  })

  it('copies typical area to the same position on every typical floor', () => {
    const grid = applyTypicalAreaToMatchingFloors(sampleGrid(), 0, '72.5')

    expect(grid.typicalSlots[0].areaM2).toBe('72.5')
    expect(grid.floors.map((floor) => floor.units[0].areaM2)).toEqual(['72.5', '72.5', '72.5'])
    expect(grid.floors.map((floor) => floor.units[0].code)).toEqual(['101', '201', '301'])
    expect(unitGridPayload([grid]).towers[0].floors[0].units[0].area_m2).toBe(72.5)
  })

  it('copies the selected unit spec to the same position on typical floors', () => {
    const grid = sampleGrid()
    const source = { ...grid.floors[0].units[0], bedrooms: '2', extraAmenityIds: [9] }
    const next = applyUnitSpecToMatchingFloors(grid, 0, source)

    expect(next.floors.map((floor) => floor.units[0].bedrooms)).toEqual(['2', '2', '2'])
    expect(next.floors[1].units[0].extraAmenityIds).toEqual([9])
    expect(next.floors[1].units[0].code).toBe('201')
  })
})
