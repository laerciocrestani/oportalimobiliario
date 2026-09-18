import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReservationKanbanBoard } from '@/components/reservations/ReservationKanbanBoard'
import type { BuilderReservationListItem } from '@/lib/api'

const reservation: BuilderReservationListItem = {
  id: 1,
  status: 'proposal_pending',
  created_at: '2026-06-12T10:00:00.000000Z',
  expires_at: '2026-06-14T10:00:00.000000Z',
  messages_count: 2,
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

describe('ReservationKanbanBoard', () => {
  it('places the card in the matching column and opens on click', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()

    render(
      <ReservationKanbanBoard
        profile="builder"
        reservations={[reservation]}
        cancellingId={null}
        canCancel
        canMessage
        onOpen={onOpen}
        onMessages={() => {}}
        onCancel={() => {}}
        onMove={() => {}}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Proposta em análise' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Proposta em análise' })).toContainElement(
      screen.getByRole('button', { name: 'João Silva' }),
    )

    await user.click(screen.getByRole('button', { name: 'João Silva' }))

    expect(onOpen).toHaveBeenCalledWith(1)
  })

  it('hides the drag handle when the reservation cannot move', () => {
    render(
      <ReservationKanbanBoard
        profile="builder"
        reservations={[{ ...reservation, kanban_column: 'sold', allowed_kanban_moves: [], status: 'sold' }]}
        cancellingId={null}
        canCancel
        canMessage
        onOpen={() => {}}
        onMessages={() => {}}
        onCancel={() => {}}
        onMove={() => {}}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Mover João Silva' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Vendida' })).toContainElement(
      screen.getByRole('button', { name: 'João Silva' }),
    )
  })
})
