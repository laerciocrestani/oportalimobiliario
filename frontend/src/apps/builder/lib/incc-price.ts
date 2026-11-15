export type InccQuote = {
  competence: string
  value: string
}

function monthKey(competence: string): string | null {
  const match = competence.match(/^(\d{4})-(\d{2})/)

  return match ? `${match[1]}-${match[2]}` : null
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')

  if (trimmed === '' || !/^\d+(\.\d+)?$/.test(trimmed)) {
    return null
  }

  const amount = Number(trimmed)

  return Number.isFinite(amount) ? amount : null
}

export function inccToBrl(priceBase: string, competence: string, indices: readonly InccQuote[]): number | null {
  const base = parseAmount(priceBase)

  if (base == null) {
    return null
  }

  const quoted = indices.flatMap((index) => {
    const key = monthKey(index.competence)
    const value = parseAmount(index.value)

    return key && value != null && value > 0 ? [{ key, value }] : []
  })

  if (quoted.length === 0) {
    return base
  }

  const current = quoted.reduce((latest, item) => (item.key > latest.key ? item : latest))
  const competenceKey = monthKey(competence)
  const competenceValue = competenceKey
    ? (quoted.find((item) => item.key === competenceKey)?.value ?? current.value)
    : current.value
  const display = base * (current.value / competenceValue)

  return Math.round(display * 100) / 100
}
