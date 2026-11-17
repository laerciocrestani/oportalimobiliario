import { describe, expect, it } from 'vitest'
import { canonicalDecimal, canonicalGroupedInteger, formatDecimalMask, formatGroupedInteger, maskInteger } from '@/apps/builder/lib/unit-input-mask'

describe('unit input masks', () => {
  it('keeps only digits and a minimum of zero', () => {
    expect(maskInteger('')).toBe('')
    expect(maskInteger('0')).toBe('0')
    expect(maskInteger('02')).toBe('2')
    expect(maskInteger('a-2b')).toBe('2')
    expect(maskInteger('-1')).toBe('1')
  })

  it('formats stored amounts and reads the mask back', () => {
    expect(formatDecimalMask('')).toBe('')
    expect(formatDecimalMask('41.41')).toBe('41,41')
    expect(formatDecimalMask('12.5')).toBe('12,50')
    expect(formatDecimalMask('320000')).toBe('320.000,00')
    expect(canonicalDecimal('58')).toBe('0.58')
    expect(canonicalDecimal('1.234,56')).toBe('1234.56')
    expect(canonicalDecimal('R$ 445.889,98')).toBe('445889.98')
    expect(formatDecimalMask(canonicalDecimal('44588998'))).toBe('445.889,98')
  })

  it('groups an INCC quantity every three digits without cents', () => {
    expect(formatGroupedInteger('')).toBe('')
    expect(formatGroupedInteger('332988')).toBe('332.988')
    expect(formatGroupedInteger('454858')).toBe('454.858')
    expect(formatGroupedInteger('445889.98')).toBe('445.889')
    expect(canonicalGroupedInteger('a-454.858')).toBe('454858')
    expect(canonicalGroupedInteger('0')).toBe('0')
    expect(formatGroupedInteger(canonicalGroupedInteger('0454858'))).toBe('454.858')
  })
})
