import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuilderContractValidatePanel } from '@/components/reservations/BuilderContractValidatePanel'
import type { ReservationAttachment } from '@/lib/api'

vi.mock('@/components/reservations/ReservationAttachmentPreview', () => ({
  ReservationAttachmentPreview: ({ attachment }: { attachment: ReservationAttachment }) => (
    <p>{attachment.original_name}</p>
  ),
}))

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
  it('shows the signed PDF and the next action', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()

    render(
      <BuilderContractValidatePanel
        title="Contrato assinado pelo comprador"
        description="Baixe o PDF, assine pela construtora e envie o arquivo."
        attachment={attachment}
        actionLabel="Enviar contrato assinado pela construtora"
        onAction={onAction}
      />,
    )

    expect(screen.getByText('contrato-assinado.pdf')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Enviar contrato assinado pela construtora' }),
    )
    expect(onAction).toHaveBeenCalled()
  })
})
