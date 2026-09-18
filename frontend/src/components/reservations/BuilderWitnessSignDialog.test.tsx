import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuilderWitnessSignDialog } from '@/components/reservations/BuilderWitnessSignDialog'

vi.mock('@/lib/api', () => ({
  builderApi: {
    signAsWitness: vi.fn(),
  },
}))

import { builderApi } from '@/lib/api'

describe('BuilderWitnessSignDialog', () => {
  it('registers the witness signature', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()

    vi.mocked(builderApi.signAsWitness).mockResolvedValue({
      status: 'contract_builder_signed',
      witnesses: [],
    })

    render(
      <BuilderWitnessSignDialog
        open
        onOpenChange={() => {}}
        reservationId={8}
        slot={1}
        onSubmitted={onSubmitted}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Registrar assinatura' }))

    await waitFor(() => {
      expect(builderApi.signAsWitness).toHaveBeenCalledWith(8, 1)
      expect(onSubmitted).toHaveBeenCalled()
    })
  })
})
