import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InvitesPage } from '@/apps/builder/InvitesPage'

const { listInvites, getInviteLink, listPendingBrokers } = vi.hoisted(() => ({
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
      declined_at: null,
      expires_at: '2026-12-31T00:00:00Z',
      last_sent_at: '2026-06-01T00:00:00Z',
      created_at: '2026-06-01T00:00:00Z',
      invite_url: 'http://corretor.localhost:5173/invite/abc',
    },
    {
      id: 2,
      name: 'Ana WhatsApp',
      email: null,
      phone: '+5511988776655',
      channel: 'whatsapp',
      token: 'def',
      status: 'pending',
      delivery_status: 'sent',
      broker_id: null,
      accepted_at: null,
      declined_at: null,
      expires_at: '2026-12-31T00:00:00Z',
      last_sent_at: '2026-06-02T00:00:00Z',
      created_at: '2026-06-02T00:00:00Z',
      invite_url: 'http://corretor.localhost:5173/invite/def',
    },
  ]),
  getInviteLink: vi.fn().mockResolvedValue({
    token: 'shared-token',
    invite_url: 'http://corretor.localhost:5173/join/shared-token',
    regenerated_at: null,
    created_at: '2026-06-01T00:00:00Z',
  }),
  listPendingBrokers: vi.fn().mockResolvedValue([]),
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
  BuilderDashboardShell: ({
    children,
    title,
    actions,
  }: {
    children: React.ReactNode
    title: string
    actions?: React.ReactNode
  }) => (
    <div>
      <h1>{title}</h1>
      {actions}
      {children}
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  builderApi: {
    listInvites,
    getInviteLink,
    listPendingBrokers,
    regenerateInviteLink: vi.fn(),
    approvePendingBroker: vi.fn(),
    rejectPendingBroker: vi.fn(),
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
      expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: /link de convite/i }))

    expect(screen.getByRole('dialog', { name: 'Link de convite para corretores' })).toBeInTheDocument()
    expect(screen.getByLabelText('Link de convite')).toHaveValue(
      'http://corretor.localhost:5173/join/shared-token',
    )
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regenerar' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    await user.click(screen.getByRole('button', { name: 'Convidar corretor' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByText('Canal de envio')).toBeInTheDocument()
    expect(screen.getByText(/enviado automaticamente por WhatsApp/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Telefone (WhatsApp)')).toBeInTheDocument()
  })

  it('filters invites by name, email or phone', async () => {
    const user = userEvent.setup()
    render(<InvitesPage />)

    await waitFor(() => {
      expect(screen.getByText('Novo Corretor')).toBeInTheDocument()
      expect(screen.getByText('Ana WhatsApp')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Buscar convites'), 'ana')

    expect(screen.getByText('Ana WhatsApp')).toBeInTheDocument()
    expect(screen.queryByText('Novo Corretor')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Buscar convites'))
    await user.type(screen.getByLabelText('Buscar convites'), 'novo@broker.com')

    expect(screen.getByText('Novo Corretor')).toBeInTheDocument()
    expect(screen.queryByText('Ana WhatsApp')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Buscar convites'))
    await user.type(screen.getByLabelText('Buscar convites'), '88776655')

    expect(screen.getByText('Ana WhatsApp')).toBeInTheDocument()
    expect(screen.queryByText('Novo Corretor')).not.toBeInTheDocument()
  })

  it('filters invites by status and channel', async () => {
    const user = userEvent.setup()
    render(<InvitesPage />)

    await waitFor(() => {
      expect(screen.getByText('Novo Corretor')).toBeInTheDocument()
      expect(screen.getByText('Ana WhatsApp')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    await user.click(screen.getByLabelText('Filtrar por canal'))
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'WhatsApp' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('option', { name: 'WhatsApp' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(screen.getByText('Ana WhatsApp')).toBeInTheDocument()
    expect(screen.queryByText('Novo Corretor')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Filtros' }))
    await user.click(screen.getByLabelText('Filtrar por canal'))
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Todos os canais' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('option', { name: 'Todos os canais' }))
    await user.click(screen.getByLabelText('Filtrar por status'))
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Pendente' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('option', { name: 'Pendente' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(screen.getByText('Novo Corretor')).toBeInTheDocument()
    expect(screen.getByText('Ana WhatsApp')).toBeInTheDocument()
  })
})
