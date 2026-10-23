import { describe, expect, it } from 'vitest'
import { maskBrazilianCurrency } from '@/lib/br-currency'

describe('maskBrazilianCurrency', () => {
  it('formats typed digits as cents in brazilian currency', () => {
    expect(maskBrazilianCurrency('')).toBe('')
    expect(maskBrazilianCurrency('1')).toMatch(/R\$\s*0,01/)
    expect(maskBrazilianCurrency('12')).toMatch(/R\$\s*0,12/)
    expect(maskBrazilianCurrency('1234')).toMatch(/R\$\s*12,34/)
    expect(maskBrazilianCurrency('123456')).toMatch(/R\$\s*1\.234,56/)
  })

  it('keeps an already formatted amount stable', () => {
    const masked = maskBrazilianCurrency('123456')

    expect(maskBrazilianCurrency(masked)).toBe(masked)
    expect(maskBrazilianCurrency('10.000,00')).toMatch(/R\$\s*10\.000,00/)
    expect(maskBrazilianCurrency('R$ 10.000,00')).toMatch(/R\$\s*10\.000,00/)
  })
})
