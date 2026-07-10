import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InvitesPage } from '@/apps/builder/InvitesPage'

const { listInvites, permissionsLoadingRef } = vi.hoisted(() => ({
  listInvites: vi.fn().mockResolvedValue([
  {
    id: 1,
    name: 'Novo Corretor',
    email: 'novo@broker.com',
    phone: null,
    channel: 'email',
    token: 'abc',
    status: 'pending',
    delivery_status: null,
    broker_id: null,
    accepted_at: null,
    expires_at: '2026-12-31T00:00:00Z',
    created_at: '2026-06-01T00:00:00Z',
    invite_url: 'http://corretor.localhost:5173/invite/abc',
  },
  ]),
  permissionsLoadingRef: { current: false },
}))

vi.mock('@/apps/builder/hooks/use-builder-permissions', () => ({
  useBuilderPermissions: () => ({
    can: (permission: string) =>
      ['invites.send', 'access.manage'].includes(permission),
    permissions: permissionsLoadingRef.current ? [] : ['invites.send', 'access.manage'],
    loading: permissionsLoadingRef.current,
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
  builderApi: {
    listInvites,
    listBrokers: vi.fn().mockResolvedValue([]),
    listBuildings: vi.fn().mockResolvedValue([]),
  },
}))

describe('InvitesPage', () => {
  it('renders invite list', async () => {
    permissionsLoadingRef.current = false
    listInvites.mockClear()
    render(<InvitesPage />)

    await waitFor(() => {
      expect(screen.getByText('Novo Corretor')).toBeInTheDocument()
      expect(screen.getByText('novo@broker.com')).toBeInTheDocument()
      expect(screen.getByText('Pendente')).toBeInTheDocument()
    })
  })

  it('waits for permissions before loading invites', async () => {
    permissionsLoadingRef.current = true
    listInvites.mockClear()
    render(<InvitesPage />)

    expect(listInvites).not.toHaveBeenCalled()
  })
})
