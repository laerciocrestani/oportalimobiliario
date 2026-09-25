import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerReturnSignedProposalDialog } from '@/components/reservations/BrokerReturnSignedProposalDialog'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    returnSignedProposal: vi.fn(),
  },
}))

import { brokerApi } from '@/lib/api'

describe('BrokerReturnSignedProposalDialog', () => {
  it('requires the signed pdf and does not send deposit proof', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()
    const signed = new File(['pdf'], 'ambas.pdf', { type: 'application/pdf' })

    vi.mocked(brokerApi.returnSignedProposal).mockResolvedValue({
      id: 12,
      unit_id: 1,
      broker_id: 2,
      client_id: 3,
      status: 'deposit_pending',
      expires_at: null,
    })

    render(
      <BrokerReturnSignedProposalDialog
        open
        onOpenChange={vi.fn()}
        reservationId={12}
        onSubmitted={onSubmitted}
      />,
    )

    expect(screen.getByRole('button', { name: 'Enviar devolução' })).toBeDisabled()
    expect(screen.queryByText('Comprovante de sinal (opcional)')).not.toBeInTheDocument()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, signed)
    await user.click(screen.getByRole('button', { name: 'Enviar devolução' }))

    await waitFor(() => {
      expect(brokerApi.returnSignedProposal).toHaveBeenCalledWith(12, signed)
      expect(onSubmitted).toHaveBeenCalled()
    })
  })
})
