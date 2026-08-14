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
  needs_reply: true,
  needs_proposal_decision: true,
  needs_deposit_proof_approval: false,
  deposit_overdue: false,
  situation: {
    previous: { key: 'proposal_submitted', label: 'Proposta enviada', occurred_at: null },
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
  it('opens kebab menu with andamento, responder and cancelar', async () => {
    const user = userEvent.setup()
    const onTimeline = vi.fn()
    const onMessages = vi.fn()
    const onCancel = vi.fn()

    render(
      <ReservationActionsMenu
        reservation={reservation}
        cancelling={false}
        onTimeline={onTimeline}
        onMessages={onMessages}
        onCancel={onCancel}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Ações — João Silva' }))

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Andamento · decisão' })).toBeInTheDocument()
    })
    expect(screen.getByRole('menuitem', { name: 'Responder · nova' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Cancelar' })).toBeInTheDocument()
  })
})
