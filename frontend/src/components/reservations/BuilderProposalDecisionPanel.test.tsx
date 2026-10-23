import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuilderProposalDecisionPanel } from '@/components/reservations/BuilderProposalDecisionPanel'

vi.mock('@/lib/api', () => ({
  builderApi: {
    decideReservationProposal: vi.fn(),
    acceptReservationProposal: vi.fn(),
    listIssueProposalTemplates: vi.fn().mockResolvedValue([]),
    previewProposalIssue: vi.fn(),
    issueProposal: vi.fn(),
  },
}))

vi.mock('@/components/reservations/ReservationAttachmentPreview', () => ({
  ReservationAttachmentPreview: ({ attachment }: { attachment: { original_name: string } }) => (
    <p>{attachment.original_name}</p>
  ),
}))

import { builderApi } from '@/lib/api'

const proposal = {
  id: 1,
  version: 1,
  client_name: 'Maria Silva',
  client_phone: '11999999999',
  payment_terms: 'Entrada de R$ 50.000',
  decision: null,
  decision_note: null,
  submitted_by: 2,
  decided_by: null,
  decided_at: null,
  created_at: '2026-08-22T11:00:00.000Z',
  client_email: '',
  client_cpf: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  marital_status: '',
  nationality: '',
  land_value: 0,
  attachments: [
    {
      id: 9,
      kind: 'proposal',
      original_name: 'proposta.pdf',
      mime_type: 'application/pdf',
      size_bytes: 2048,
      uploaded_by: 2,
      created_at: '2026-08-22T11:00:00.000Z',
      file_url: '/builder/reservations/10/attachments/9/file',
    },
  ],
}

describe('BuilderProposalDecisionPanel', () => {
  it('requires a note before rejecting and does not offer a return', async () => {
    const user = userEvent.setup()

    render(
      <BuilderProposalDecisionPanel reservationId={10} proposal={proposal} onDecided={() => {}} />,
    )

    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument()
    expect(screen.queryByText('proposta.pdf')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Devolver' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeEnabled()

    await user.type(screen.getByLabelText('Observação da decisão'), 'Ajustar entrada.')

    expect(screen.getByRole('button', { name: 'Recusar' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Recusar' }))

    expect(builderApi.decideReservationProposal).toHaveBeenCalledWith(10, 'rejected', 'Ajustar entrada.')
  })

  it('accepts without an uploaded signed pdf', async () => {
    const user = userEvent.setup()

    render(
      <BuilderProposalDecisionPanel reservationId={10} proposal={proposal} onDecided={() => {}} />,
    )

    expect(screen.queryByLabelText('PDF assinado pela construtora')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aceitar' }))

    await waitFor(() => {
      expect(builderApi.decideReservationProposal).toHaveBeenCalledWith(10, 'accepted', '')
    })
  })

  it('generates the proposal pdf from the selected template', async () => {
    const user = userEvent.setup()
    vi.mocked(builderApi.listIssueProposalTemplates).mockResolvedValueOnce([
      { id: 3, name: 'Proposta comercial padrão' },
    ])
    vi.mocked(builderApi.previewProposalIssue).mockResolvedValue({
      template: { id: 3, name: 'Proposta comercial padrão' },
      system_values: { nome_cliente: 'Maria Silva' },
      custom_variables: [],
      unknown_placeholders: [],
      required_custom_slugs: [],
      suggested_price: '450000',
    })
    const onDecided = vi.fn()

    render(
      <BuilderProposalDecisionPanel reservationId={10} proposal={proposal} onDecided={onDecided} />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Gerar PDF' }))

    await waitFor(() => {
      expect(builderApi.issueProposal).toHaveBeenCalledWith(10, {
        proposal_template_id: 3,
        values: { nome_cliente: 'Maria Silva' },
      })
      expect(onDecided).toHaveBeenCalled()
    })
  })
})
