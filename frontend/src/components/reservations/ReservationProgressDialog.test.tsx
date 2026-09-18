import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReservationProgressDialog } from '@/components/reservations/ReservationProgressDialog'

const getReservationTimeline = vi.fn()

vi.mock('@/lib/api', () => ({
  builderApi: {
    getReservationTimeline: (...args: unknown[]) => getReservationTimeline(...args),
  },
  brokerApi: {
    getReservationTimeline: vi.fn(),
  },
}))

vi.mock('@/apps/builder/components/ReservationMessagesDialog', () => ({
  ReservationMessagesDialog: () => null,
}))

describe('ReservationProgressDialog', () => {
  it('renders the andamento as a centered dialog', async () => {
    getReservationTimeline.mockResolvedValue({
      reservation_id: 1,
      current_stage: 'proposal_pending',
      expires_at: null,
      unit: { id: 10, code: '101', status: 'pre_reserved' },
      deposit_overdue: false,
      client: { id: 1, name: 'João Silva', phone: '11999999999', email: null },
      current_proposal: null,
      current_deposit_proof: null,
      current_signed_contract: null,
      current_builder_signed_contract: null,
      witnesses: [],
      attachments: [],
      steps: [
        {
          key: 'proposal_decision',
          label: 'Decisão do gestor',
          status: 'current',
          occurred_at: null,
          due_at: null,
          actor: null,
          actions: [],
        },
      ],
    })

    render(
      <ReservationProgressDialog
        profile="builder"
        reservationId={1}
        open
        onOpenChange={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Andamento da reserva' })).toBeInTheDocument()
      expect(screen.getByText('Decisão do gestor')).toBeInTheDocument()
    })
  })
})
