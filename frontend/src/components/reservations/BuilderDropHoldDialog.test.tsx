import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuilderDropHoldDialog } from '@/components/reservations/BuilderDropHoldDialog'

vi.mock('@/lib/api', () => ({
  builderApi: {
    dropReservationHold: vi.fn(),
  },
}))

import { builderApi } from '@/lib/api'

describe('BuilderDropHoldDialog', () => {
  it('drops the hold with an optional reason', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()

    vi.mocked(builderApi.dropReservationHold).mockResolvedValue(undefined)

    render(
      <BuilderDropHoldDialog
        open
        onOpenChange={() => {}}
        reservationId={7}
        onSubmitted={onSubmitted}
      />,
    )

    await user.type(screen.getByLabelText('Motivo (opcional)'), 'Cliente desistiu.')
    await user.click(screen.getByRole('button', { name: 'Encerrar agora' }))

    await waitFor(() => {
      expect(builderApi.dropReservationHold).toHaveBeenCalledWith(7, 'Cliente desistiu.')
      expect(onSubmitted).toHaveBeenCalled()
    })
  })
})
