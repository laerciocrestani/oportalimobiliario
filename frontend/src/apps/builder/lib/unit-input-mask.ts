const DECIMAL_DIGIT_LIMIT = 15

export function maskInteger(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
}

export function canonicalGroupedInteger(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
}

export function formatGroupedInteger(stored: string): string {
  const trimmed = stored.trim()

  if (trimmed === '') {
    return ''
  }

  const normalized = trimmed.replace(',', '.')
  const whole = /^\d+(\.\d+)?$/.test(normalized) ? normalized.split('.')[0] : trimmed.replace(/\D/g, '')

  return whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatDecimalMask(stored: string): string {
  const trimmed = stored.trim()

  if (trimmed === '') {
    return ''
  }

  const normalized = trimmed.replace(',', '.')

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return maskDecimalDigits(trimmed.replace(/\D/g, ''))
  }

  const [whole, fraction = ''] = normalized.split('.')
  const cents = `${fraction}00`.slice(0, 2)

  return maskDecimalDigits(`${whole}${cents}`)
}

export function canonicalDecimal(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, DECIMAL_DIGIT_LIMIT)

  if (digits === '') {
    return ''
  }

  const padded = digits.padStart(3, '0')
  const whole = String(Number(padded.slice(0, -2)))
  const fraction = padded.slice(-2).replace(/0+$/, '')

  return fraction === '' ? whole : `${whole}.${fraction}`
}

function maskDecimalDigits(digits: string): string {
  const limited = digits.replace(/\D/g, '').slice(0, DECIMAL_DIGIT_LIMIT)

  if (limited === '') {
    return ''
  }

  const padded = limited.padStart(3, '0')
  const whole = padded.slice(0, -2).replace(/^0+(?=\d)/, '')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${grouped},${padded.slice(-2)}`
}
