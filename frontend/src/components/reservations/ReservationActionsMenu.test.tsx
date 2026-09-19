import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReservationActionsMenu } from '@/components/reservations/ReservationActionsMenu'
import type { BuilderReservationListItem } from '@/lib/api'

const reservation: BuilderReservationListItem = {
  id: 1,
  status: 'proposal_pending',
  created_at: '2026-06-12T10:00:00.000000Z',
  expires_at: '2026-06-14T10:00:00.000000Z',
  messages_count: 2,
  unread_messages_count: 2,
  needs_reply: true,
  needs_proposal_decision: true,
  needs_deposit_proof_approval: false,
  needs_witness_signature: false,
  needs_sold_validation: false,
  needs_action: true,
  pending_action: 'proposal_decision',
  deposit_overdue: false,
  kanban_column: 'proposal_review',
  allowed_kanban_moves: ['cancelled', 'proposal_formalization'],
  situation: {
    previous: { key: 'proposal_submitted', label: 'Proposta', occurred_at: null },
    current: {
      key: 'proposal_decision',
      label: 'Decisão do gestor',
      status: 'current',
      waiting_on: 'builder',
      occurred_at: null,
    },
    next: { key: 'deposit_window', label: 'Aguardando sinal (48h)', occurred_at: null },
  },
  client: { id: 1, name: 'João Silva' },
  broker: { id: 2, name: 'Corretor Alpha' },
  unit: {
    id: 10,
    code: '1201',
    building: { id: 3, name: 'Residencial Aurora' },
  },
}

describe('ReservationActionsMenu', () => {
  it('opens kebab menu with andamento and cancelar, without a separate chat item', async () => {
    const user = userEvent.setup()
    const onTimeline = vi.fn()
    const onCancel = vi.fn()

    render(
      <ReservationActionsMenu
        reservation={reservation}
        cancelling={false}
        onTimeline={onTimeline}
        onCancel={onCancel}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Ações — João Silva' }))

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Andamento · decisão' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('menuitem', { name: 'Responder · nova' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Cancelar' })).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'Andamento · decisão' }))
    expect(onTimeline).toHaveBeenCalledOnce()
  })

  it('keeps andamento for cancelled reservations and hides cancel', async () => {
    const user = userEvent.setup()
    const onTimeline = vi.fn()

    render(
      <ReservationActionsMenu
        reservation={{ ...reservation, status: 'cancelled', needs_reply: false, needs_proposal_decision: false }}
        cancelling={false}
        onTimeline={onTimeline}
        onCancel={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Ações — João Silva' }))

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Andamento · conversa' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('menuitem', { name: 'Ver conversa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  it('hides cancel when the viewer cannot manage the reservation', async () => {
    const user = userEvent.setup()

    render(
      <ReservationActionsMenu
        reservation={{ ...reservation, pending_action: 'witness_signature', needs_witness_signature: true }}
        cancelling={false}
        canCancel={false}
        onTimeline={() => {}}
        onCancel={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Ações — João Silva' }))

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Andamento · testemunha' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('menuitem', { name: 'Responder · nova' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Cancelar' })).not.toBeInTheDocument()
  })
})
