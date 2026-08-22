import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuilderMarkSoldDialog } from '@/components/reservations/BuilderMarkSoldDialog'

vi.mock('@/lib/api', () => ({
  builderApi: {
    validateSignedContract: vi.fn(),
  },
}))

import { builderApi } from '@/lib/api'

describe('BuilderMarkSoldDialog', () => {
  it('confirms the sale with an optional note', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()

    vi.mocked(builderApi.validateSignedContract).mockResolvedValue({
      status: 'sold',
      unit_status: 'sold',
    })

    render(
      <BuilderMarkSoldDialog
        open
        onOpenChange={() => {}}
        reservationId={7}
        onSubmitted={onSubmitted}
      />,
    )

    await user.type(screen.getByLabelText('Observação (opcional)'), 'Documentos conferidos.')
    await user.click(screen.getByRole('button', { name: 'Unidade vendida' }))

    await waitFor(() => {
      expect(builderApi.validateSignedContract).toHaveBeenCalledWith(7, 'Documentos conferidos.')
      expect(onSubmitted).toHaveBeenCalled()
    })
  })
})
