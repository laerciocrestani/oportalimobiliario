import { describe, expect, it } from 'vitest'
import { formatBrazilianMobilePhone, isBrazilianMobilePhoneComplete, isBrazilianMobilePhoneValid, isValidEmail } from '@/lib/format-phone'

describe('formatBrazilianMobilePhone', () => {
  it('formats digits as brazilian mobile phone', () => {
    expect(formatBrazilianMobilePhone('')).toBe('')
    expect(formatBrazilianMobilePhone('11')).toBe('(11')
    expect(formatBrazilianMobilePhone('119')).toBe('(11) 9')
    expect(formatBrazilianMobilePhone('1199999')).toBe('(11) 99999')
    expect(formatBrazilianMobilePhone('11999999999')).toBe('(11) 99999-9999')
  })

  it('strips non-digits and limits to 11 numbers', () => {
    expect(formatBrazilianMobilePhone('(11) 99999-9999')).toBe('(11) 99999-9999')
    expect(formatBrazilianMobilePhone('(11) 99999-9999123')).toBe('(11) 99999-9999')
  })
})

describe('isBrazilianMobilePhoneValid', () => {
  it('accepts valid brazilian mobile numbers', () => {
    expect(isBrazilianMobilePhoneValid('(11) 99999-9999')).toBe(true)
    expect(isBrazilianMobilePhoneValid('(21) 98888-7777')).toBe(true)
  })

  it('rejects incomplete or invalid numbers', () => {
    expect(isBrazilianMobilePhoneValid('(11) 9999-9999')).toBe(false)
    expect(isBrazilianMobilePhoneValid('(11) 89999-9999')).toBe(false)
    expect(isBrazilianMobilePhoneValid('(10) 99999-9999')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('validates email format', () => {
    expect(isValidEmail('corretor@demo.com')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('a@b.c')).toBe(true)
  })
})
