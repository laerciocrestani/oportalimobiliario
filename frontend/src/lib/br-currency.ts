const CURRENCY_DIGITS = 15

export function maskBrazilianCurrency(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, CURRENCY_DIGITS)

  if (digits === '') {
    return ''
  }

  const amount = Number(digits) / 100

  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
