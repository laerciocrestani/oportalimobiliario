import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReservationFilesPanel } from '@/components/reservations/ReservationFilesPanel'
import type { ReservationAttachment } from '@/lib/api'

function attachment(overrides: Partial<ReservationAttachment> & Pick<ReservationAttachment, 'id' | 'kind' | 'original_name'>): ReservationAttachment {
  return {
    mime_type: 'application/pdf',
    size_bytes: 1024,
    uploaded_by: 2,
    created_at: '2026-07-10T19:10:00+00:00',
    file_url: `/builder/reservations/1/attachments/${overrides.id}/file`,
    ...overrides,
  }
}

describe('ReservationFilesPanel', () => {
  it('lists historic attachments grouped by kind', () => {
    render(
      <ReservationFilesPanel
        attachments={[
          attachment({ id: 9, kind: 'deposit_proof', original_name: 'pix.pdf' }),
          attachment({ id: 4, kind: 'proposal', original_name: 'simulacao.pdf' }),
        ]}
      />,
    )

    expect(screen.getByRole('complementary', { name: 'Arquivos da reserva' })).toBeInTheDocument()
    expect(screen.getByText('Comprovante de pagamento')).toBeInTheDocument()
    expect(screen.getByText('pix.pdf')).toBeInTheDocument()
    expect(screen.getByText('Anexos da proposta')).toBeInTheDocument()
    expect(screen.getByText('simulacao.pdf')).toBeInTheDocument()
  })
})
