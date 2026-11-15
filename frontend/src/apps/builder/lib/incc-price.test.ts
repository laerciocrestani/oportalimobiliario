import { describe, expect, it } from 'vitest'
import { inccToBrl } from '@/apps/builder/lib/incc-price'

const indices = [
  { competence: '2026-07-01', value: '1020.500000' },
  { competence: '2026-02-01', value: '1000.000000' },
]

describe('inccToBrl', () => {
  it('raises the reais price when the current index is above the competence', () => {
    expect(inccToBrl('100000', '2026-02', indices)).toBe(102050)
    expect(inccToBrl('332988', '2026-02', indices)).toBe(339814.25)
  })

  it('keeps the quantity when the competence is the current month or missing', () => {
    expect(inccToBrl('332988', '2026-07', indices)).toBe(332988)
    expect(inccToBrl('332988', '', indices)).toBe(332988)
    expect(inccToBrl('332988', '', [])).toBe(332988)
  })

  it('returns null without a quantity', () => {
    expect(inccToBrl('', '2026-02', indices)).toBeNull()
    expect(inccToBrl('abc', '2026-02', indices)).toBeNull()
  })
})
