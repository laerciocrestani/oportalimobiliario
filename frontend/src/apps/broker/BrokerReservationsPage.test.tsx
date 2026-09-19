import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BrokerReservationsPage } from '@/apps/broker/BrokerReservationsPage'

const { listReservations } = vi.hoisted(() => ({
  listReservations: vi.fn(),
}))

vi.mock('@/apps/broker/components/BrokerDashboardShell', () => ({
  BrokerDashboardShell: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  ApiRequestError: class ApiRequestError extends Error {
    status: number
    code?: string
    constructor(message: string, status: number, _errors?: unknown, code?: string) {
      super(message)
      this.status = status
      this.code = code
    }
  },
  brokerApi: {
    listReservations,
    moveReservationKanban: vi.fn(),
    cancelReservation: vi.fn(),
  },
}))

vi.mock('@/components/reservations/ReservationProgressDialog', () => ({
  ReservationProgressDialog: () => null,
}))

describe('BrokerReservationsPage', () => {
  it('renders the broker kanban without listing other brokers', async () => {
    listReservations.mockResolvedValue([
      {
        id: 1,
        status: 'deposit_pending',
        created_at: '2026-06-12T10:00:00.000000Z',
        expires_at: '2026-06-14T10:00:00.000000Z',
        messages_count: 1,
        needs_reply: true,
        needs_proposal_decision: false,
        needs_deposit_proof_approval: false,
        needs_witness_signature: false,
        needs_sold_validation: false,
        needs_action: true,
        pending_action: 'submit_deposit_proof',
        deposit_overdue: false,
        kanban_column: 'docs_deposit',
        allowed_kanban_moves: ['cancelled'],
        situation: {
          previous: {
            key: 'proposal_decision',
            label: 'Decisão do gestor',
            occurred_at: '2026-07-10T19:00:00.000Z',
          },
          current: {
            key: 'deposit_window',
            label: 'Aguardando sinal (48h)',
            status: 'current',
            waiting_on: 'broker',
            occurred_at: '2026-07-10T19:30:00.000Z',
          },
          next: {
            key: 'deposit_proof',
            label: 'Comprovante de pagamento',
            occurred_at: null,
          },
        },
        client: { id: 1, name: 'Maria Souza' },
        broker: { id: 2, name: 'Corretor Demo' },
        unit: {
          id: 10,
          code: '501',
          building: { id: 3, name: 'Torre Central' },
        },
      },
    ])

    render(<BrokerReservationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Documentação & Sinal' })).toBeInTheDocument()
      expect(screen.queryByText('Corretor Demo')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Abrir andamento de Maria Souza' })).toBeInTheDocument()
      expect(screen.getByText('Maria Souza')).toBeInTheDocument()
      expect(screen.getByText('Torre Central')).toBeInTheDocument()
      expect(screen.getByText('501')).toBeInTheDocument()
      expect(screen.queryByText('Imóvel')).not.toBeInTheDocument()
      expect(screen.getByText('É necessário anexar o comprovante de sinal.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Aguardando você' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Anexar' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ações — Maria Souza' })).toBeInTheDocument()
    })
  })
})
