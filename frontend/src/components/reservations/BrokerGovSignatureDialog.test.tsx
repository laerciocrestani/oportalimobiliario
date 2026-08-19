import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerGovSignatureDialog } from '@/components/reservations/BrokerGovSignatureDialog'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    markContractGovSigned: vi.fn(),
  },
}))

import { brokerApi } from '@/lib/api'

describe('BrokerGovSignatureDialog', () => {
  it('registers GOV signature and closes', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()
    const onOpenChange = vi.fn()

    vi.mocked(brokerApi.markContractGovSigned).mockResolvedValue({ status: 'contract_issued' })

    render(
      <BrokerGovSignatureDialog
        open
        onOpenChange={onOpenChange}
        reservationId={42}
        onSubmitted={onSubmitted}
      />,
    )

    await user.type(screen.getByLabelText('Observação (opcional)'), 'Assinado no GOV')
    await user.click(screen.getByRole('button', { name: 'Confirmar assinatura GOV' }))

    await waitFor(() => {
      expect(brokerApi.markContractGovSigned).toHaveBeenCalledWith(42, 'Assinado no GOV')
      expect(onSubmitted).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
