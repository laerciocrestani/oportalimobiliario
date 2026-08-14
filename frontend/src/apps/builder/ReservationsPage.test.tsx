import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReservationsPage } from '@/apps/builder/ReservationsPage'

const { listReservations } = vi.hoisted(() => ({
  listReservations: vi.fn(),
}))

vi.mock('@/apps/builder/hooks/use-builder-permissions', () => ({
  useBuilderPermissions: () => ({
    can: (permission: string) => permission === 'reservations.cancel',
    permissions: ['reservations.cancel'],
    loading: false,
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

vi.mock('@/apps/builder/components/ReservationMessagesDialog', () => ({
  ReservationMessagesDialog: () => null,
}))

vi.mock('@/lib/api', () => ({
  builderApi: {
    listReservations,
    cancelReservation: vi.fn(),
  },
}))

describe('ReservationsPage', () => {
  it('renders reservation table columns and data', async () => {
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
        deposit_overdue: false,
        situation: {
          previous: {
            key: 'proposal_submitted',
            label: 'Proposta enviada',
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
      expect(screen.getByText('Cliente')).toBeInTheDocument()
      expect(screen.getByText('Empreendimento')).toBeInTheDocument()
      expect(screen.getByText('Situação')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Corretor')).toBeInTheDocument()
      expect(screen.queryByRole('columnheader', { name: 'Data' })).not.toBeInTheDocument()
      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.getByText(/Residencial Aurora · 1201/)).toBeInTheDocument()
      expect(screen.getByText('Corretor Alpha')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Conversar — Corretor Alpha · nova' })).toBeInTheDocument()
      expect(screen.getByText('Decisão do gestor')).toBeInTheDocument()
      expect(screen.getByText('Proposta enviada')).toBeInTheDocument()
      expect(screen.getByText('Aguardando sinal (48h)')).toBeInTheDocument()
      expect(screen.getByText('Aguardando você')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ações — João Silva' })).toBeInTheDocument()
      expect(screen.getByText('Proposta pendente')).toBeInTheDocument()
    })
  })

  it('opens cancel dialog from the actions menu', async () => {
    const user = userEvent.setup()
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
        deposit_overdue: false,
        situation: {
          previous: {
            key: 'proposal_submitted',
            label: 'Proposta enviada',
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
})
