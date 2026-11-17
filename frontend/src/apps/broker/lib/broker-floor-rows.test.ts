import { describe, expect, it } from 'vitest'
import {
  bedroomSummary,
  floorPriceSummary,
  floorStockSummary,
  floorTitle,
  groupUnitsByFloor,
} from '@/apps/broker/lib/broker-floor-rows'
import type { Unit } from '@/lib/api'

function unit(partial: Partial<Unit> & Pick<Unit, 'id' | 'code'>): Unit {
  return {
    floor: null,
    area_m2: null,
    price: null,
    status: 'available',
    ...partial,
  }
}

describe('groupUnitsByFloor', () => {
  it('stacks floors from the top and keeps garages on their own row', () => {
    const rows = groupUnitsByFloor([
      unit({ id: '1', code: '101', floor: 1, floor_kind: 'residential' }),
      unit({ id: '2', code: '402', floor: 4, floor_kind: 'residential' }),
      unit({ id: '3', code: '401', floor: 4, floor_kind: 'residential' }),
      unit({ id: '4', code: 'S1-01', floor: -1, floor_kind: 'garage' }),
    ])

    expect(rows.map((row) => row.floor)).toEqual([4, 1, -1])
    expect(rows[0]?.units.map((item) => item.code)).toEqual(['401', '402'])
    expect(rows[2]?.kind).toBe('garage')
  })
})

describe('floor summaries', () => {
  const units = [
    unit({ id: '1', code: '401', floor: 4, bedrooms: 2, private_area_m2: '100', price: '98000' }),
    unit({ id: '2', code: '402', floor: 4, bedrooms: 3, area_m2: '123', price: '232000' }),
  ]

  it('labels the floor the way the broker reads it', () => {
    expect(floorTitle(4, 'residential')).toBe('4º andar')
    expect(floorTitle(0, null)).toBe('Térreo')
    expect(floorTitle(-1, 'garage')).toBe('Subsolo 1')
    expect(floorTitle(null, 'garage')).toBe('Garagem')
  })

  it('joins the bedroom counts on the floor', () => {
    expect(bedroomSummary(units)).toBe('2 e 3 dorms')
    expect(bedroomSummary([unit({ id: '1', code: '401', bedrooms: 2 })])).toBe('2 dorms')
    expect(bedroomSummary([unit({ id: '1', code: '401' })])).toBeNull()
  })

  it('summarizes available units against the floor total and the area span', () => {
    expect(floorStockSummary(units, false)).toBe('2 de 2 unidades - 100 a 123 m²')
    expect(floorStockSummary([units[0]!], false)).toBe('1 de 1 unidade - 100 m²')
    expect(floorStockSummary([
      unit({ id: '1', code: '501', status: 'sold', area_m2: '42' }),
      unit({ id: '2', code: '502', status: 'sold', area_m2: '48' }),
    ], false)).toBe('0 de 2 unidades - 42 a 48 m²')
    expect(floorStockSummary([unit({ id: '9', code: 'S1', floor_kind: 'garage', private_area_m2: '12.5' })], true)).toBe('1 de 1 vaga - 12,5 m²')
  })

  it('summarizes the price span and falls back when the price is missing', () => {
    expect(floorPriceSummary(units)).toMatch(/R\$\s*98\.000,00 a R\$\s*232\.000,00/)
    expect(floorPriceSummary([units[0]!])).toMatch(/R\$\s*98\.000,00/)
    expect(floorPriceSummary([unit({ id: '1', code: '401', price: null })])).toBe('Valor sob consulta')
  })
})
