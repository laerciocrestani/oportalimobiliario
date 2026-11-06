import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuilderProposalDecisionPanel } from '@/components/reservations/BuilderProposalDecisionPanel'

vi.mock('@/lib/api', () => ({
  builderApi: {
    decideReservationProposal: vi.fn(),
  },
}))

import { builderApi } from '@/lib/api'

describe('BuilderProposalDecisionPanel', () => {
  it('asks for a note before rejecting and does not offer a return or pdf', async () => {
    const user = userEvent.setup()

    render(
      <BuilderProposalDecisionPanel reservationId={10} onDecided={() => {}} />,
    )

    expect(screen.queryByRole('button', { name: 'Devolver' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gerar PDF' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reemitir PDF' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Recusar' }))

    const dialog = await screen.findByRole('dialog', { name: 'Recusar proposta' })
    const confirm = within(dialog).getByRole('button', { name: 'Recusar' })

    expect(confirm).toBeDisabled()

    await user.type(within(dialog).getByLabelText('Observação da decisão'), 'Ajustar entrada.')

    expect(confirm).toBeEnabled()

    await user.click(confirm)

    expect(builderApi.decideReservationProposal).toHaveBeenCalledWith(10, 'rejected', 'Ajustar entrada.')
  })

  it('accepts from the confirmation dialog without a note', async () => {
    const user = userEvent.setup()

    render(
      <BuilderProposalDecisionPanel reservationId={10} onDecided={() => {}} />,
    )

    await user.click(screen.getByRole('button', { name: 'Aceitar' }))

    const dialog = await screen.findByRole('dialog', { name: 'Aceitar proposta' })

    expect(within(dialog).queryByLabelText('PDF assinado pela construtora')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Aceitar' }))

    await waitFor(() => {
      expect(builderApi.decideReservationProposal).toHaveBeenCalledWith(10, 'accepted', '')
    })
  })

  it('sends the acceptance note from the confirmation dialog', async () => {
    const user = userEvent.setup()

    render(
      <BuilderProposalDecisionPanel reservationId={10} onDecided={() => {}} />,
    )

    await user.click(screen.getByRole('button', { name: 'Aceitar' }))

    const dialog = await screen.findByRole('dialog', { name: 'Aceitar proposta' })

    await user.type(within(dialog).getByLabelText('Observação da decisão'), 'Condições ok.')
    await user.click(within(dialog).getByRole('button', { name: 'Aceitar' }))

    await waitFor(() => {
      expect(builderApi.decideReservationProposal).toHaveBeenCalledWith(10, 'accepted', 'Condições ok.')
    })
  })
})
