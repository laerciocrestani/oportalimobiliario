import { describe, expect, it } from 'vitest'
import {
  filterBuildings,
  getBuilderFilterOptions,
  groupUnitsByBuilding,
  summarizeUnits,
  type BuildingWithUnits,
} from '@/apps/broker/lib/group-units-by-building'
import type { Unit } from '@/lib/api'

const buildingsFixture: BuildingWithUnits[] = [
  {
    id: 1,
    name: 'Alpha Residence',
    description: null,
    city: 'São Paulo',
    state: 'SP',
    published: true,
    seo_title: null,
    seo_description: null,
    tenant: { id: 10, name: 'Construtora Alpha' },
    units: [],
  },
  {
    id: 2,
    name: 'Beta Tower',
    description: null,
    city: 'Campinas',
    state: 'SP',
    published: true,
    seo_title: null,
    seo_description: null,
    tenant: { id: 20, name: 'Construtora Beta' },
    units: [],
  },
]

describe('groupUnitsByBuilding', () => {
  it('groups units by building and sorts by name', () => {
    const units: Unit[] = [
      {
        id: 1,
        code: '101',
        floor: 1,
        area_m2: '50',
        price: '300000',
        status: 'available',
        building: {
          id: 2,
          name: 'Beta',
          description: null,
          city: null,
          state: null,
          published: true,
          seo_title: null,
          seo_description: null,
        },
      },
      {
        id: 2,
        code: '102',
        floor: 1,
        area_m2: '50',
        price: '300000',
        status: 'reserved',
        building: {
          id: 1,
          name: 'Alpha',
          description: null,
          city: null,
          state: null,
          published: true,
          seo_title: null,
          seo_description: null,
        },
      },
    ]

    const grouped = groupUnitsByBuilding(units)

    expect(grouped).toHaveLength(2)
    expect(grouped[0]?.name).toBe('Alpha')
    expect(grouped[0]?.units).toHaveLength(1)
    expect(grouped[1]?.units).toHaveLength(1)
  })
})

describe('summarizeUnits', () => {
  it('counts unit statuses', () => {
    const summary = summarizeUnits([
      { id: 1, code: '1', floor: 1, area_m2: null, price: null, status: 'available' },
      { id: 2, code: '2', floor: 1, area_m2: null, price: null, status: 'available' },
      { id: 3, code: '3', floor: 1, area_m2: null, price: null, status: 'reserved' },
    ])

    expect(summary.total).toBe(3)
    expect(summary.available).toBe(2)
    expect(summary.reserved).toBe(1)
  })
})

describe('getBuilderFilterOptions', () => {
  it('returns unique builders sorted by name', () => {
    expect(getBuilderFilterOptions(buildingsFixture)).toEqual([
      { id: 10, name: 'Construtora Alpha' },
      { id: 20, name: 'Construtora Beta' },
    ])
  })
})

describe('filterBuildings', () => {
  it('filters by building name', () => {
    const result = filterBuildings(buildingsFixture, { search: 'alpha', builderId: '' })

    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('Alpha Residence')
  })

  it('filters by builder id', () => {
    const result = filterBuildings(buildingsFixture, { search: '', builderId: '20' })

    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('Beta Tower')
  })

  it('combines search and builder filters', () => {
    const result = filterBuildings(buildingsFixture, { search: 'beta', builderId: '10' })

    expect(result).toHaveLength(0)
  })
})
