import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProposalsPage } from '@/apps/builder/ProposalsPage'

const { listProposalTemplates, listProposalVariables, createProposalTemplate } = vi.hoisted(() => ({
  listProposalTemplates: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Proposta comercial padrão',
      body_markdown: 'Cliente {{nome_cliente}}',
      custom_variables: [],
      is_active: true,
    },
  ]),
  listProposalVariables: vi.fn().mockResolvedValue([
    { slug: 'nome_cliente', label: 'Nome do cliente', group: 'cliente' },
  ]),
  createProposalTemplate: vi.fn().mockResolvedValue({
    id: 2,
    name: 'Novo',
    body_markdown: 'Texto',
    custom_variables: [],
    is_active: true,
  }),
}))

vi.mock('@/apps/builder/hooks/use-builder-permissions', () => ({
  useBuilderPermissions: () => ({
    can: (permission: string) => permission === 'proposals.manage',
    permissions: ['proposals.manage'],
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
    listProposalTemplates,
    listProposalVariables,
    createProposalTemplate,
    updateProposalTemplate: vi.fn(),
    deleteProposalTemplate: vi.fn(),
  },
}))

describe('ProposalsPage', () => {
  it('lists templates and creates a new one', async () => {
    const user = userEvent.setup()
    render(<ProposalsPage />)

    await waitFor(() => {
      expect(screen.getByText('Proposta comercial padrão')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Nome'), 'Promessa')
    await user.click(screen.getByLabelText('Texto (Markdown)'))
    await user.paste('Unidade {{codigo_unidade}}')
    await user.click(screen.getByRole('button', { name: 'Criar modelo' }))

    await waitFor(() => {
      expect(createProposalTemplate).toHaveBeenCalledWith({
        name: 'Promessa',
        body_markdown: 'Unidade {{codigo_unidade}}',
        is_active: true,
        custom_variables: [],
      })
    })
  })
})
