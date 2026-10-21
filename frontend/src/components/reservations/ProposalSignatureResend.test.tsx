import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProposalSignatureResend } from '@/components/reservations/ProposalSignatureResend'

vi.mock('@/lib/api', () => ({
  ApiRequestError: class ApiRequestError extends Error {},
  builderApi: {
    resendProposalSignatureLinks: vi.fn().mockResolvedValue({ notified: 2 }),
    resendContractSignatureLinks: vi.fn().mockResolvedValue({ notified: 1 }),
  },
  brokerApi: {
    resendProposalSignatureLinks: vi.fn(),
    resendContractSignatureLinks: vi.fn(),
  },
}))

import { brokerApi, builderApi } from '@/lib/api'

describe('ProposalSignatureResend', () => {
  it('resends the signature link for people who have not signed', async () => {
    const user = userEvent.setup()

    render(<ProposalSignatureResend profile="builder" reservationId={115} />)

    await user.click(screen.getByRole('button', { name: 'Reenviar link de assinatura' }))

    await waitFor(() => {
      expect(builderApi.resendProposalSignatureLinks).toHaveBeenCalledWith(115)
      expect(screen.getByText('Link reenviado para 2 pessoas que ainda não assinaram.')).toBeInTheDocument()
    })
    expect(brokerApi.resendProposalSignatureLinks).not.toHaveBeenCalled()
  })

  it('resends the contract link while the contract is waiting for signatures', async () => {
    vi.mocked(builderApi.resendProposalSignatureLinks).mockClear()
    const user = userEvent.setup()

    render(<ProposalSignatureResend profile="builder" reservationId={115} document="contract" />)

    await user.click(screen.getByRole('button', { name: 'Reenviar link de assinatura' }))

    await waitFor(() => {
      expect(builderApi.resendContractSignatureLinks).toHaveBeenCalledWith(115)
      expect(screen.getByText('Link reenviado para 1 pessoa que ainda não assinou.')).toBeInTheDocument()
    })
    expect(builderApi.resendProposalSignatureLinks).not.toHaveBeenCalled()
  })
})
