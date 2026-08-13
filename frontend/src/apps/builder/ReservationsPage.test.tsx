import { render, screen, waitFor } from '@testing-library/react'
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
      expect(screen.getByText('Corretor')).toBeInTheDocument()
      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.getByText(/Residencial Aurora · 1201/)).toBeInTheDocument()
      expect(screen.getByText('Corretor Alpha')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Andamento · decisão' })).toBeInTheDocument()
      expect(screen.getByText('Proposta pendente')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Responder · nova' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    })
  })
})
