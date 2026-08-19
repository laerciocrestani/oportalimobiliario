import { describe, expect, it } from 'vitest'
import {
  formatAmenityNames,
  formatListedPrice,
  formatPriceCompetence,
  formatUnitSpecSummary,
} from '@/lib/unit-listing'

describe('unit-listing', () => {
  it('formats the calculated price in BRL', () => {
    expect(formatListedPrice('450000.00')).toMatch(/R\$\s*450\.000,00/)
  })

  it('uses consult copy when the display price is missing', () => {
    expect(formatListedPrice(null)).toBe('Valor sob consulta')
    expect(formatListedPrice('')).toBe('Valor sob consulta')
  })

  it('summarizes the useful spec sheet subset', () => {
    expect(
      formatUnitSpecSummary({
        area_m2: '72.00',
        bedrooms: 2,
        bathrooms: 1,
        suites: 1,
        floor: 12,
      }),
    ).toBe('72 m² · 2 quartos · 1 suíte · 1 banheiro · 12º andar')
  })

  it('lists a capped amenity subset', () => {
    expect(
      formatAmenityNames([{ name: 'Piscina' }, { name: 'Academia' }, { name: 'Salão' }, { name: 'Cowork' }]),
    ).toBe('Piscina, Academia, Salão +1')
  })

  it('formats price competence as month/year', () => {
    expect(formatPriceCompetence('2026-02-01')).toBe('02/2026')
  })
})
