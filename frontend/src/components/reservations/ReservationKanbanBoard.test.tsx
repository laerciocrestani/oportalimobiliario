import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

const preReservation: BuilderReservationListItem = {
  ...reservation,
  status: 'pre_hold',
  created_at: '2026-09-18T10:00:00.000Z',
  expires_at: '2026-09-20T10:00:00.000Z',
  needs_action: false,
  pending_action: null,
  needs_proposal_decision: false,
  kanban_column: 'pre_reservation',
  allowed_kanban_moves: ['cancelled'],
  situation: {
    previous: { key: 'pre_hold_created', label: 'Pré-reserva', occurred_at: '2026-09-18T10:00:00.000Z' },
    current: {
      key: 'dialogue',
      label: 'Diálogo',
      status: 'current',
      waiting_on: 'broker',
      occurred_at: null,
    },
    next: { key: 'proposal_submitted', label: 'Proposta', occurred_at: null },
  },
}

describe('ReservationKanbanBoard', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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
        onProcessRequired={() => {}}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Proposta em análise' })).toBeInTheDocument()
    expect(screen.getAllByText('Nenhuma reserva aqui')).toHaveLength(6)
    expect(screen.getByRole('region', { name: 'Proposta em análise' }).querySelector('svg')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Proposta em análise' })).toContainElement(
      screen.getByRole('button', { name: 'Abrir andamento de João Silva' }),
    )
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Residencial Aurora')).toBeInTheDocument()
    expect(screen.getByText('Unid. 1201')).toBeInTheDocument()
    expect(screen.queryByText('Imóvel')).not.toBeInTheDocument()
    expect(screen.getByText('É necessário responder a proposta do cliente.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abrir andamento de João Silva' }))

    expect(onOpen).toHaveBeenCalledWith(1)
    expect(screen.queryByLabelText(/Prazo da pré-reserva/)).not.toBeInTheDocument()
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
        onProcessRequired={() => {}}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Mover João Silva' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Vendida' })).toContainElement(
      screen.getByRole('button', { name: 'Abrir andamento de João Silva' }),
    )
    expect(screen.queryByLabelText(/Prazo da pré-reserva/)).not.toBeInTheDocument()
  })

  it('shows a hold countdown footer on pre-reservation cards and follows expires_at', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-19T10:00:00.000Z'))

    const { rerender } = render(
      <ReservationKanbanBoard
        profile="builder"
        reservations={[preReservation]}
        cancellingId={null}
        canCancel
        canMessage
        onOpen={() => {}}
        onMessages={() => {}}
        onCancel={() => {}}
        onMove={() => {}}
        onProcessRequired={() => {}}
      />,
    )

    const halfRemaining = screen.getByRole('progressbar', { name: /até 20\/09.*resta 1d/ })

    expect(screen.getByRole('region', { name: 'Pré-reserva/Diálogo' })).toContainElement(halfRemaining)
    expect(halfRemaining).toHaveClass('[&_[data-slot=progress-indicator]]:bg-amber-500')

    rerender(
      <ReservationKanbanBoard
        profile="builder"
        reservations={[{ ...preReservation, expires_at: '2026-09-22T10:00:00.000Z' }]}
        cancellingId={null}
        canCancel
        canMessage
        onOpen={() => {}}
        onMessages={() => {}}
        onCancel={() => {}}
        onMove={() => {}}
        onProcessRequired={() => {}}
      />,
    )

    expect(screen.getByRole('progressbar', { name: /até 22\/09.*resta 3d/ })).toHaveClass(
      '[&_[data-slot=progress-indicator]]:bg-zinc-500',
    )
  })
})
