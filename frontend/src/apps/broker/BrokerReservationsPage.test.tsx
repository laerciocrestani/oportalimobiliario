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

vi.mock('@/apps/builder/components/ReservationMessagesDialog', () => ({
  ReservationMessagesDialog: () => null,
}))

vi.mock('@/lib/api', () => ({
  brokerApi: {
    listReservations,
    cancelReservation: vi.fn(),
  },
}))

describe('BrokerReservationsPage', () => {
  it('renders broker reservation table without corretor column', async () => {
    listReservations.mockResolvedValue([
      {
        id: 1,
        created_at: '2026-06-12T10:00:00.000000Z',
        expires_at: '2026-06-14T10:00:00.000000Z',
        messages_count: 1,
        needs_reply: true,
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
      expect(screen.getByText('Cliente')).toBeInTheDocument()
      expect(screen.getByText('Empreendimento')).toBeInTheDocument()
      expect(screen.getByText('Situação')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.queryByText('Corretor')).not.toBeInTheDocument()
      expect(screen.queryByRole('columnheader', { name: 'Data' })).not.toBeInTheDocument()
      expect(screen.getByText('Maria Souza')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Conversar — Maria Souza · nova' })).toBeInTheDocument()
      expect(screen.getByText('Aguardando sinal (48h)')).toBeInTheDocument()
      expect(screen.getByText('Aguardando você')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ações — Maria Souza' })).toBeInTheDocument()
    })
  })
})
