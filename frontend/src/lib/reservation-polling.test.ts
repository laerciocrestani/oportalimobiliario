import { describe, expect, it } from 'vitest'
import {
  buildStatusSnapshot,
  detectPreHoldTransitionToast,
} from '@/lib/reservation-polling'

describe('reservation-polling', () => {
  it('shows toast once on available to pre_reserved transition from another broker', () => {
    const previous = buildStatusSnapshot([{ id: 1, status: 'available' }])
    const toastShownFor = new Set<number>()

    const first = detectPreHoldTransitionToast(
      previous,
      [{ id: 1, code: '101', status: 'pre_reserved', pre_hold: { held_by_me: false } }],
      toastShownFor,
    )

    expect(first).toEqual({ unitCode: '101', unitId: 1 })
    toastShownFor.add(first!.unitId)

    const second = detectPreHoldTransitionToast(
      buildStatusSnapshot([{ id: 1, status: 'pre_reserved' }]),
      [{ id: 1, code: '101', status: 'pre_reserved', pre_hold: { held_by_me: false } }],
      toastShownFor,
    )

    expect(second).toBeNull()
  })

  it('does not toast for own pre_hold', () => {
    const previous = buildStatusSnapshot([{ id: 2, status: 'available' }])

    const result = detectPreHoldTransitionToast(
      previous,
      [{ id: 2, code: '202', status: 'pre_reserved', pre_hold: { held_by_me: true } }],
      new Set(),
    )

    expect(result).toBeNull()
  })

  it('does not toast when status is unchanged', () => {
    const previous = buildStatusSnapshot([{ id: 3, status: 'pre_reserved' }])

    const result = detectPreHoldTransitionToast(
      previous,
      [{ id: 3, code: '303', status: 'pre_reserved', pre_hold: { held_by_me: false } }],
      new Set(),
    )

    expect(result).toBeNull()
  })
})
