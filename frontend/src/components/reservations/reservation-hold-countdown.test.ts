import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatHoldDeadline,
  formatHoldRemaining,
  holdProgressTone,
  holdRemainingMs,
  holdRemainingPercent,
  holdWindowMs,
} from '@/components/reservations/reservation-hold-countdown'

const createdAt = '2026-09-18T10:00:00.000Z'
const expiresAt = '2026-09-20T10:00:00.000Z'
const extendedExpiresAt = '2026-09-22T10:00:00.000Z'

describe('reservation-hold-countdown', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('computes remaining time against expires_at', () => {
    const now = Date.parse('2026-09-19T10:00:00.000Z')

    expect(holdRemainingMs(expiresAt, now)).toBe(24 * 60 * 60 * 1000)
    expect(holdRemainingPercent(createdAt, expiresAt, now)).toBe(50)
  })

  it('widens the window when the hold is extended', () => {
    const now = Date.parse('2026-09-19T10:00:00.000Z')

    expect(holdWindowMs(createdAt, expiresAt)).toBe(48 * 60 * 60 * 1000)
    expect(holdWindowMs(createdAt, extendedExpiresAt)).toBe(96 * 60 * 60 * 1000)
    expect(holdRemainingPercent(createdAt, extendedExpiresAt, now)).toBe(75)
    expect(formatHoldRemaining(extendedExpiresAt, now)).toBe('3d')
  })

  it('formats compact remaining labels', () => {
    const now = Date.parse('2026-09-20T09:00:00.000Z')

    expect(formatHoldRemaining(expiresAt, now)).toBe('1h')
    expect(formatHoldRemaining(expiresAt, now + 35 * 60 * 1000)).toBe('25min')
    expect(formatHoldRemaining(expiresAt, Date.parse('2026-09-20T11:00:00.000Z'))).toBe('Prazo encerrado')
  })

  it('picks progress tone from remaining percent', () => {
    expect(holdProgressTone(100)).toBe('healthy')
    expect(holdProgressTone(51)).toBe('healthy')
    expect(holdProgressTone(50)).toBe('warning')
    expect(holdProgressTone(49)).toBe('warning')
    expect(holdProgressTone(30)).toBe('warning')
    expect(holdProgressTone(29)).toBe('critical')
    expect(holdProgressTone(0)).toBe('critical')
  })

  it('formats the deadline in pt-BR', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-18T10:00:00.000Z'))

    expect(formatHoldDeadline(expiresAt)).toMatch(/20\/09, /)
  })
})
