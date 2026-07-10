import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BrokersPage } from '@/apps/builder/BrokersPage'

const { listBrokers } = vi.hoisted(() => ({
  listBrokers: vi.fn().mockResolvedValue([
    {
      id: 10,
      name: 'Corretor Demo',
      email: 'corretor@demo.com',
      accepted_at: '2026-06-01T00:00:00Z',
      status: 'active',
      buildings_count: 2,
      buildings: [
        { id: 1, name: 'Residencial Aurora' },
        { id: 2, name: 'Edifício Horizonte' },
      ],
    },
  ]),
}))

vi.mock('@/apps/builder/hooks/use-builder-permissions', () => ({
  useBuilderPermissions: () => ({
    can: (permission: string) => permission === 'access.manage',
    permissions: ['access.manage'],
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

vi.mock('@/apps/builder/components/BrokerAccessDialog', () => ({
  BrokerAccessDialog: () => null,
}))

vi.mock('@/lib/api', () => ({
  builderApi: {
    listBrokers,
  },
}))

describe('BrokersPage', () => {
  it('renders broker list with building summary', async () => {
    listBrokers.mockClear()
    render(<BrokersPage />)

    await waitFor(() => {
      expect(screen.getByText('Corretor Demo')).toBeInTheDocument()
      expect(screen.getByText('corretor@demo.com')).toBeInTheDocument()
      expect(screen.getByText('2 empreendimentos')).toBeInTheDocument()
      expect(screen.getByText('Residencial Aurora')).toBeInTheDocument()
      expect(screen.getByText('Edifício Horizonte')).toBeInTheDocument()
    })
  })
})
