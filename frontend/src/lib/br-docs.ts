export function cpfDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

export function isValidCpf(value: string): boolean {
  const digits = cpfDigits(value)

  if (digits.length !== 11) {
    return false
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return false
  }

  const checkDigit = (length: number): number => {
    let sum = 0

    for (let index = 0; index < length; index++) {
      sum += Number(digits[index]) * (length + 1 - index)
    }

    return ((10 * sum) % 11) % 10
  }

  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10])
}

export function formatCpf(value: string): string {
  const digits = cpfDigits(value)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

export function formatPhone(value: string): string {
  const digits = phoneDigits(value)

  if (digits.length === 0) {
    return ''
  }

  if (digits.length <= 2) {
    return `(${digits}`
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}
