import { describe, expect, it } from 'vitest'
import { cnpjDigits, cpfDigits, formatCnpj, formatCpf, formatPhone, isValidCnpj, isValidCpf } from '@/lib/br-docs'

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

  it('formats and validates CNPJ', () => {
    expect(formatCnpj('11444777000161')).toBe('11.444.777/0001-61')
    expect(cnpjDigits('11.444.777/0001-61')).toBe('11444777000161')
    expect(isValidCnpj('11.444.777/0001-61')).toBe(true)
    expect(isValidCnpj('11222333000180')).toBe(false)
    expect(isValidCnpj('00000000000000')).toBe(false)
  })

  it('formats mobile and landline phones with DDD', () => {
    expect(formatPhone('11988887777')).toBe('(11) 98888-7777')
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444')
  })
})
