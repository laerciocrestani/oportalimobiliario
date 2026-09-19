import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReservationsPage } from '@/apps/builder/ReservationsPage'

const { listReservations, pendingActionsCount, permissionsState } = vi.hoisted(() => ({
  listReservations: vi.fn(),
  pendingActionsCount: vi.fn(),
  permissionsState: {
    permissions: ['reservations.cancel'] as string[],
    loading: false,
  },
}))

vi.mock('@/apps/builder/hooks/use-builder-permissions', () => ({
  useBuilderPermissions: () => ({
    can: (permission: string) => permissionsState.permissions.includes(permission),
    permissions: permissionsState.permissions,
    loading: permissionsState.loading,
    user: { name: 'Builder', email: 'builder@demo.com' },
  }),
}))

vi.mock('@/apps/builder/components/BuilderDashboardShell', () => ({
  BuilderDashboardShell: ({ children, title }: { children: React.ReactNode; title: string }) => (
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
  builderApi: {
    listReservations,
    pendingActionsCount,
    moveReservationKanban: vi.fn(),
    cancelReservation: vi.fn(),
  },
}))

vi.mock('@/components/reservations/ReservationProgressDialog', () => ({
  ReservationProgressDialog: () => null,
}))

describe('ReservationsPage', () => {
  beforeEach(() => {
    permissionsState.permissions = ['reservations.cancel']
    permissionsState.loading = false
    listReservations.mockReset()
    pendingActionsCount.mockReset()
  })

  it('renders the kanban board with reservation cards', async () => {
    pendingActionsCount.mockResolvedValue({ count: 1, witness_scope: false })
    listReservations.mockResolvedValue([
      {
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
          previous: {
            key: 'proposal_submitted',
            label: 'Proposta',
            occurred_at: '2026-07-10T18:00:00.000Z',
          },
          current: {
            key: 'proposal_decision',
            label: 'Decisão do gestor',
            status: 'current',
            waiting_on: 'builder',
            occurred_at: '2026-07-10T19:00:00.000Z',
          },
          next: {
            key: 'deposit_window',
            label: 'Aguardando sinal (48h)',
            occurred_at: null,
          },
        },
        client: { id: 1, name: 'João Silva' },
        broker: { id: 2, name: 'Corretor Alpha' },
        unit: {
          id: 10,
          code: '1201',
          building: { id: 3, name: 'Residencial Aurora' },
        },
      },
    ])

    render(<ReservationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pré-reserva/Diálogo' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Proposta em análise' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Vendida' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Cancelada' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Abrir andamento de João Silva' })).toBeInTheDocument()
      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.getByText('Residencial Aurora')).toBeInTheDocument()
      expect(screen.getByText('1201')).toBeInTheDocument()
      expect(screen.queryByText('Imóvel')).not.toBeInTheDocument()
      expect(screen.getByText('É necessário responder a proposta do cliente.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Aguardando você' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Responder' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ações — João Silva' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Mover João Silva' })).toBeInTheDocument()
    })
  })

  it('opens cancel dialog from the actions menu', async () => {
    const user = userEvent.setup()
    pendingActionsCount.mockResolvedValue({ count: 1, witness_scope: false })
    listReservations.mockResolvedValue([
      {
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
          previous: {
            key: 'proposal_submitted',
            label: 'Proposta',
            occurred_at: '2026-07-10T18:00:00.000Z',
          },
          current: {
            key: 'proposal_decision',
            label: 'Decisão do gestor',
            status: 'current',
            waiting_on: 'builder',
            occurred_at: '2026-07-10T19:00:00.000Z',
          },
          next: {
            key: 'deposit_window',
            label: 'Aguardando sinal (48h)',
            occurred_at: null,
          },
        },
        client: { id: 1, name: 'João Silva' },
        broker: { id: 2, name: 'Corretor Alpha' },
        unit: {
          id: 10,
          code: '1201',
          building: { id: 3, name: 'Residencial Aurora' },
        },
      },
    ])

    render(<ReservationsPage />)

    await user.click(await screen.findByRole('button', { name: 'Ações — João Silva' }))

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Cancelar' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('menuitem', { name: 'Cancelar' }))

    expect(screen.getByRole('dialog', { name: 'Cancelar reserva' })).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo *')).toBeInTheDocument()
  })

  it('lists reservations for a manager even when witness_scope is false', async () => {
    pendingActionsCount.mockResolvedValue({ count: 0, witness_scope: false })
    listReservations.mockResolvedValue([])

    render(<ReservationsPage />)

    await waitFor(() => {
      expect(listReservations).toHaveBeenCalled()
      expect(screen.getByRole('heading', { name: 'Pré-reserva/Diálogo' })).toBeInTheDocument()
    })

    expect(pendingActionsCount).not.toHaveBeenCalled()
    expect(screen.queryByText('Você não tem permissão para visualizar reservas.')).not.toBeInTheDocument()
  })

  it('keeps loading while permissions are still fetching', () => {
    permissionsState.permissions = []
    permissionsState.loading = true

    render(<ReservationsPage />)

    expect(screen.getByText('Carregando reservas...')).toBeInTheDocument()
    expect(screen.queryByText('Você não tem permissão para visualizar reservas.')).not.toBeInTheDocument()
    expect(listReservations).not.toHaveBeenCalled()
    expect(pendingActionsCount).not.toHaveBeenCalled()
  })

  it('denies access when the user cannot manage reservations and has no witness scope', async () => {
    permissionsState.permissions = []
    pendingActionsCount.mockResolvedValue({ count: 0, witness_scope: false })

    render(<ReservationsPage />)

    await waitFor(() => {
      expect(screen.getByText('Você não tem permissão para visualizar reservas.')).toBeInTheDocument()
    })

    expect(listReservations).not.toHaveBeenCalled()
  })
})
