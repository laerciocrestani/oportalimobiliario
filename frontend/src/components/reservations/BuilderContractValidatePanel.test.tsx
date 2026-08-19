import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuilderContractValidatePanel } from '@/components/reservations/BuilderContractValidatePanel'
import type { ReservationAttachment } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  builderApi: {
    validateSignedContract: vi.fn(),
  },
}))

vi.mock('@/components/reservations/ReservationAttachmentPreview', () => ({
  ReservationAttachmentPreview: ({ attachment }: { attachment: ReservationAttachment }) => (
    <p>{attachment.original_name}</p>
  ),
}))

import { builderApi } from '@/lib/api'

const attachment: ReservationAttachment = {
  id: 9,
  kind: 'contract_signed',
  original_name: 'contrato-assinado.pdf',
  mime_type: 'application/pdf',
  size_bytes: 2048,
  uploaded_by: 2,
  created_at: '2026-08-19T12:00:00+00:00',
  file_url: '/builder/reservations/1/attachments/9/file',
}

describe('BuilderContractValidatePanel', () => {
  it('requires GOV confirmation before validating the sale', async () => {
    const user = userEvent.setup()
    const onValidated = vi.fn()

    vi.mocked(builderApi.validateSignedContract).mockResolvedValue({
      status: 'sold',
      unit_status: 'sold',
    })

    render(
      <BuilderContractValidatePanel
        reservationId={7}
        attachment={attachment}
        onValidated={onValidated}
      />,
    )

    expect(screen.getByText('contrato-assinado.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Validar e concluir venda' })).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: 'Assinatura GOV da construtora registrada' }))
    await user.click(screen.getByRole('button', { name: 'Validar e concluir venda' }))

    await waitFor(() => {
      expect(builderApi.validateSignedContract).toHaveBeenCalledWith(7)
      expect(onValidated).toHaveBeenCalled()
    })
  })
})
