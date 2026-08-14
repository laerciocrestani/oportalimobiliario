import { describe, expect, it } from 'vitest'
import { RESERVATION_STEP_ICONS, RESERVATION_STEP_KEYS, reservationStepIcon } from '@/components/reservations/reservation-step-icons'
import { Building2Icon } from 'lucide-react'

describe('reservationStepIcon', () => {
  it('maps every timeline process to a lucide icon', () => {
    expect(RESERVATION_STEP_KEYS).toHaveLength(12)

    for (const key of RESERVATION_STEP_KEYS) {
      expect(RESERVATION_STEP_ICONS[key]).toBeDefined()
    }
  })

  it('falls back to Building2Icon for unknown steps', () => {
    expect(reservationStepIcon('unknown_step')).toBe(Building2Icon)
  })
})
