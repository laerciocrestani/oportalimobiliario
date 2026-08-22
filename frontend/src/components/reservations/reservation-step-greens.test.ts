import { describe, expect, it } from 'vitest'
import { RESERVATION_STEP_KEYS } from '@/components/reservations/reservation-step-icons'
import {
  RESERVATION_STEP_GREEN_CLASSES,
  reservationStepGreenBgClass,
  reservationStepGreenClass,
  reservationStepProgress,
  reservationStepProgressFillClass,
  reservationStepProgressIndex,
} from '@/components/reservations/reservation-step-greens'

describe('reservationStepGreenClass', () => {
  it('maps the 13 timeline steps to a rising green scale', () => {
    expect(RESERVATION_STEP_KEYS).toHaveLength(13)
    expect(RESERVATION_STEP_GREEN_CLASSES).toHaveLength(13)
    expect(reservationStepProgressIndex('pre_hold_created')).toBe(0)
    expect(reservationStepProgressIndex('sold')).toBe(12)
    expect(reservationStepGreenClass('pre_hold_created')).toContain('bg-emerald-50')
    expect(reservationStepGreenClass('sold')).toContain('bg-[oklch(12%_0.08_172.552)]')
  })

  it('falls back to the first green for unknown steps', () => {
    expect(reservationStepProgressIndex('unknown_step')).toBe(0)
    expect(reservationStepGreenClass('unknown_step')).toBe(RESERVATION_STEP_GREEN_CLASSES[0])
  })

  it('exposes only the background token for the vertical timeline', () => {
    expect(reservationStepGreenBgClass('pre_hold_created')).toBe('bg-emerald-50')
    expect(reservationStepGreenBgClass('dialogue')).toBe('bg-emerald-100')
    expect(reservationStepGreenBgClass('sold')).toBe('bg-[oklch(12%_0.08_172.552)]')
  })

  it('maps progress fill to the same rising green scale', () => {
    expect(reservationStepProgressFillClass('pre_hold_created')).toContain('bg-emerald-50')
    expect(reservationStepProgressFillClass('deposit_window')).toContain('bg-emerald-400')
    expect(reservationStepProgressFillClass('sold')).toContain('bg-[oklch(12%_0.08_172.552)]')
  })

  it('computes the current step as a fraction of the 13-step flow', () => {
    expect(reservationStepProgress('pre_hold_created')).toEqual({ current: 1, total: 13, percent: 8 })
    expect(reservationStepProgress('proposal_decision')).toEqual({ current: 4, total: 13, percent: 31 })
    expect(reservationStepProgress('sold')).toEqual({ current: 13, total: 13, percent: 100 })
  })
})
