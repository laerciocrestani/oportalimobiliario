import { describe, expect, it } from 'vitest'
import { groupUnitsByFloor } from '@/apps/builder/lib/group-units-by-floor'
import type { Unit } from '@/lib/api'

function unit(overrides: Partial<Unit> & Pick<Unit, 'id' | 'code'>): Unit {
  return {
    floor: null,
    area_m2: null,
    price: null,
    status: 'available',
    ...overrides,
  }
}

describe('groupUnitsByFloor', () => {
  it('groups units by floor in descending order', () => {
    const groups = groupUnitsByFloor([
      unit({ id: 1, code: '101', floor: 1 }),
      unit({ id: 2, code: '1801', floor: 18 }),
      unit({ id: 3, code: '1201', floor: 12 }),
      unit({ id: 4, code: 'G01', floor: null }),
    ])

    expect(groups.map((group) => group.label)).toEqual(['18°', '12°', '1°', 'Sem andar'])
    expect(groups[0]?.units.map((item) => item.code)).toEqual(['1801'])
    expect(groups[3]?.units.map((item) => item.code)).toEqual(['G01'])
  })

  it('sorts units by code within the same floor', () => {
    const groups = groupUnitsByFloor([
      unit({ id: 1, code: '1202', floor: 12 }),
      unit({ id: 2, code: '1201', floor: 12 }),
    ])

    expect(groups[0]?.units.map((item) => item.code)).toEqual(['1201', '1202'])
  })
})
