export function formatBrazilianMobilePhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length === 0) {
    return ''
  }

  if (digits.length <= 2) {
    return `(${digits}`
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function isBrazilianMobilePhoneComplete(value: string): boolean {
  return value.replace(/\D/g, '').length === 11
}

export function isBrazilianMobilePhoneValid(value: string): boolean {
  const digits = value.replace(/\D/g, '')

  if (digits.length !== 11) {
    return false
  }

  const areaCode = Number(digits.slice(0, 2))

  return areaCode >= 11 && areaCode <= 99 && digits[2] === '9'
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
