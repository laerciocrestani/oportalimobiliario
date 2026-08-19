export function isoDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function defaultActivityRange(now = new Date()): { from: string; to: string } {
  const to = new Date(now)
  const from = new Date(now)
  from.setDate(from.getDate() - 29)

  return { from: isoDateLocal(from), to: isoDateLocal(to) }
}

export function formatActivityTimestamp(value: string | null): string {
  if (value === null || value === '') {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('pt-BR')
}
