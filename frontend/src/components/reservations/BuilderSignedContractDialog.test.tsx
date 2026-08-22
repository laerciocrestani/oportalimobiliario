import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuilderSignedContractDialog } from '@/components/reservations/BuilderSignedContractDialog'

vi.mock('@/lib/api', () => ({
  builderApi: {
    uploadBuilderSignedContract: vi.fn(),
  },
}))

import { builderApi } from '@/lib/api'

describe('BuilderSignedContractDialog', () => {
  it('uploads the selected PDF', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()

    vi.mocked(builderApi.uploadBuilderSignedContract).mockResolvedValue({
      status: 'contract_builder_signed',
      attachment: {
        id: 4,
        kind: 'contract_signed_builder',
        original_name: 'contrato-construtora.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        uploaded_by: 1,
        created_at: '2026-08-21T12:00:00+00:00',
        file_url: '/builder/reservations/8/attachments/4/file',
      },
    })

    render(
      <BuilderSignedContractDialog
        open
        onOpenChange={() => {}}
        reservationId={8}
        onSubmitted={onSubmitted}
      />,
    )

    const file = new File(['pdf'], 'contrato-construtora.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: 'Enviar contrato assinado' }))

    await waitFor(() => {
      expect(builderApi.uploadBuilderSignedContract).toHaveBeenCalledWith(8, file)
      expect(onSubmitted).toHaveBeenCalled()
    })
  })
})
