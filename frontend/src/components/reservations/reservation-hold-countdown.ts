const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function holdRemainingMs(expiresAt: string, now: number): number {
  const expiresAtMs = Date.parse(expiresAt)

  if (Number.isNaN(expiresAtMs)) {
    return 0
  }

  return Math.max(0, expiresAtMs - now)
}

export function holdWindowMs(createdAt: string, expiresAt: string): number {
  const createdAtMs = Date.parse(createdAt)
  const expiresAtMs = Date.parse(expiresAt)

  if (Number.isNaN(createdAtMs) || Number.isNaN(expiresAtMs)) {
    return 1
  }

  return Math.max(expiresAtMs - createdAtMs, 1)
}

export function holdRemainingPercent(createdAt: string, expiresAt: string, now: number): number {
  const remaining = holdRemainingMs(expiresAt, now)
  const total = holdWindowMs(createdAt, expiresAt)

  return Math.min(100, Math.round((remaining / total) * 100))
}

export type HoldProgressTone = 'healthy' | 'warning' | 'critical'

export function holdProgressTone(percent: number): HoldProgressTone {
  if (percent > 50) {
    return 'healthy'
  }

  if (percent >= 30) {
    return 'warning'
  }

  return 'critical'
}

export function formatHoldRemaining(expiresAt: string, now: number): string {
  const remaining = holdRemainingMs(expiresAt, now)

  if (remaining <= 0) {
    return 'Prazo encerrado'
  }

  const days = Math.floor(remaining / DAY_MS)
  const hours = Math.floor((remaining % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((remaining % HOUR_MS) / MINUTE_MS)
  const seconds = Math.floor((remaining % MINUTE_MS) / SECOND_MS)

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`
  }

  return `${seconds}s`
}

export function formatHoldDeadline(expiresAt: string): string {
  const date = new Date(expiresAt)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const dayMonth = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

  return `${dayMonth}, ${time}`
}
