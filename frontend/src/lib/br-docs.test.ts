import { describe, expect, it } from 'vitest'
import { cpfDigits, formatCpf, formatPhone, isValidCpf } from '@/lib/br-docs'

describe('br-docs', () => {
  it('formats CPF with punctuation', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25')
    expect(cpfDigits('529.982.247-25')).toBe('52998224725')
  })

  it('validates CPF check digits', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('11144477735')).toBe(true)
    expect(isValidCpf('12345678901')).toBe(false)
    expect(isValidCpf('00000000000')).toBe(false)
    expect(isValidCpf('111.111.111-11')).toBe(false)
    expect(isValidCpf('5299822472')).toBe(false)
  })

  it('formats mobile and landline phones with DDD', () => {
    expect(formatPhone('11988887777')).toBe('(11) 98888-7777')
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444')
  })
})
