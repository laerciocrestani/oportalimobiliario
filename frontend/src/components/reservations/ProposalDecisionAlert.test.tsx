import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProposalDecisionAlert } from '@/components/reservations/ProposalDecisionAlert'
import type { ReservationProposal } from '@/lib/api'

const baseProposal: ReservationProposal = {
  id: 1,
  version: 1,
  client_name: 'Maria Silva',
  client_phone: '11999999999',
  payment_terms: 'Entrada de R$ 50.000 + 24x de R$ 5.000',
  decision: 'returned',
  decision_note: 'Ajustar condições de pagamento.',
  submitted_by: 2,
  decided_by: 3,
  decided_at: '2026-08-22T12:00:00.000Z',
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
}

describe('ProposalDecisionAlert', () => {
  it('shows a returned proposal alert and opens the dialogue', async () => {
    const user = userEvent.setup()
    const onOpenDialogue = vi.fn()

    render(
      <ProposalDecisionAlert proposal={baseProposal} onOpenDialogue={onOpenDialogue} />,
    )

    expect(screen.getByText('Proposta devolvida')).toBeInTheDocument()
    expect(screen.getByText('Ajustar condições de pagamento.')).toBeInTheDocument()
    expect(screen.getByText('Entrada de R$ 50.000 + 24x de R$ 5.000')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abrir diálogo' }))

    expect(onOpenDialogue).toHaveBeenCalledOnce()
  })

  it('shows a rejected proposal alert without repeating the proposal body when asked', () => {
    render(
      <ProposalDecisionAlert
        proposal={{
          ...baseProposal,
          decision: 'rejected',
          decision_note: 'Perfil fora da política.',
        }}
        onOpenDialogue={() => {}}
        showProposal={false}
      />,
    )

    expect(screen.getByText('Proposta recusada')).toBeInTheDocument()
    expect(screen.getByText('Perfil fora da política.')).toBeInTheDocument()
    expect(screen.queryByText('Entrada de R$ 50.000 + 24x de R$ 5.000')).not.toBeInTheDocument()
  })
})
