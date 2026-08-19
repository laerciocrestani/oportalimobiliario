import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerSignedContractDialog } from '@/components/reservations/BrokerSignedContractDialog'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    uploadSignedContract: vi.fn(),
  },
}))

import { brokerApi } from '@/lib/api'

describe('BrokerSignedContractDialog', () => {
  it('uploads the selected PDF', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()

    vi.mocked(brokerApi.uploadSignedContract).mockResolvedValue({
      status: 'contract_uploaded',
      attachment: {
        id: 3,
        kind: 'contract_signed',
        original_name: 'contrato-assinado.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        uploaded_by: 2,
        created_at: '2026-08-19T12:00:00+00:00',
        file_url: '/broker/reservations/8/attachments/3/file',
      },
    })

    render(
      <BrokerSignedContractDialog
        open
        onOpenChange={() => {}}
        reservationId={8}
        onSubmitted={onSubmitted}
      />,
    )

    const file = new File(['pdf'], 'contrato-assinado.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: 'Enviar contrato assinado' }))

    await waitFor(() => {
      expect(brokerApi.uploadSignedContract).toHaveBeenCalledWith(8, file)
      expect(onSubmitted).toHaveBeenCalled()
    })
  })
})
