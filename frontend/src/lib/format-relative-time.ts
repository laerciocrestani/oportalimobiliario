const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export function formatShortDate(value: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatRelativeTimePtBr(value: string | Date, now: Date = new Date()): string {
  const date = new Date(value)
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < MINUTE_MS) {
    return 'há menos de 1 minuto'
  }

  const totalMinutes = Math.floor(diffMs / MINUTE_MS)
  const totalHours = Math.floor(diffMs / HOUR_MS)
  const days = Math.floor(diffMs / DAY_MS)
  const hours = totalHours % 24
  const minutes = totalMinutes % 60

  if (totalHours < 1) {
    return `há ${totalMinutes} ${pluralize(totalMinutes, 'minuto', 'minutos')}`
  }

  if (totalHours < 24) {
    if (minutes === 0) {
      return `há ${totalHours} ${pluralize(totalHours, 'hora', 'horas')}`
    }

    return `há ${totalHours} ${pluralize(totalHours, 'hora', 'horas')} e ${minutes} ${pluralize(minutes, 'minuto', 'minutos')}`
  }

  if (hours === 0) {
    return `há ${days} ${pluralize(days, 'dia', 'dias')}`
  }

  return `há ${days} ${pluralize(days, 'dia', 'dias')} e ${hours} ${pluralize(hours, 'hora', 'horas')}`
}
