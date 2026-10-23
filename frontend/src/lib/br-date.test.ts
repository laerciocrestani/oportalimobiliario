import { describe, expect, it } from 'vitest'
import { brazilianDateToIso, maskBrazilianDate } from '@/lib/br-date'

describe('maskBrazilianDate', () => {
  it('formats digits as dd/mm/yyyy', () => {
    expect(maskBrazilianDate('1')).toBe('1')
    expect(maskBrazilianDate('10')).toBe('10')
    expect(maskBrazilianDate('1010')).toBe('10/10')
    expect(maskBrazilianDate('10102026')).toBe('10/10/2026')
  })

  it('converts an iso date from the calendar', () => {
    expect(maskBrazilianDate('2026-10-10')).toBe('10/10/2026')
    expect(brazilianDateToIso('10/10/2026')).toBe('2026-10-10')
    expect(brazilianDateToIso('32/10/2026')).toBe('')
  })
})
