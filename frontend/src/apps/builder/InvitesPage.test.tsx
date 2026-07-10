import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InvitesPage } from '@/apps/builder/InvitesPage'

const { listInvites } = vi.hoisted(() => ({
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
}))

vi.mock('@/apps/builder/hooks/use-builder-permissions', () => ({
  useBuilderPermissions: () => ({
    can: (permission: string) => permission === 'invites.send',
    permissions: ['invites.send'],
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

vi.mock('@/lib/api', () => ({
  builderApi: {
    listInvites,
    createInvite: vi.fn().mockResolvedValue({
      id: 2,
      name: 'Outro Corretor',
      email: 'outro@broker.com',
      channel: 'email',
    }),
  },
}))

describe('InvitesPage', () => {
  it('renders invite table and opens create dialog', async () => {
    const user = userEvent.setup()
    listInvites.mockClear()
    render(<InvitesPage />)

    await waitFor(() => {
      expect(screen.getByText('Novo Corretor')).toBeInTheDocument()
      expect(screen.getByText('novo@broker.com')).toBeInTheDocument()
      expect(screen.getByText('Pendente')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Convidar corretor' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByText('Canal de envio')).toBeInTheDocument()
    expect(screen.getByText(/enviado automaticamente por WhatsApp/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Telefone (WhatsApp)')).toBeInTheDocument()
  })
})
