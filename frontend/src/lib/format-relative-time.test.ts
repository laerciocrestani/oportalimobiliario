import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatRelativeTimePtBr, formatShortDate } from '@/lib/format-relative-time'

describe('formatShortDate', () => {
  it('formats date in pt-BR', () => {
    expect(formatShortDate('2026-06-20T15:00:00.000Z')).toMatch(/20\/06\/2026/)
  })
})

describe('formatRelativeTimePtBr', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats days and hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T17:00:00.000Z'))

    expect(formatRelativeTimePtBr('2026-06-20T15:00:00.000Z')).toBe('há 3 dias e 2 horas')
  })

  it('formats minutes for recent invites', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-20T15:10:00.000Z'))

    expect(formatRelativeTimePtBr('2026-06-20T15:00:00.000Z')).toBe('há 10 minutos')
  })
})
