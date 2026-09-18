import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuilderExtendHoldDialog } from '@/components/reservations/BuilderExtendHoldDialog'

vi.mock('@/lib/api', () => ({
  builderApi: {
    extendReservationHold: vi.fn(),
  },
}))

import { builderApi } from '@/lib/api'

describe('BuilderExtendHoldDialog', () => {
  it('extends the hold by 48 hours', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()

    vi.mocked(builderApi.extendReservationHold).mockResolvedValue({
      status: 'pre_hold',
      expires_at: '2026-09-19T12:00:00+00:00',
    })

    render(
      <BuilderExtendHoldDialog
        open
        onOpenChange={() => {}}
        reservationId={7}
        onSubmitted={onSubmitted}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Estender +48h' }))

    await waitFor(() => {
      expect(builderApi.extendReservationHold).toHaveBeenCalledWith(7)
      expect(onSubmitted).toHaveBeenCalled()
    })
  })
})
