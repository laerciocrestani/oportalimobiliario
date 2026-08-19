import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ContractsPage } from '@/apps/builder/ContractsPage'

const { listContractTemplates, listContractVariables, createContractTemplate } = vi.hoisted(() => ({
  listContractTemplates: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Compra e venda padrão',
      body_markdown: 'Cliente {{nome_cliente}}',
      custom_variables: [],
      is_active: true,
    },
  ]),
  listContractVariables: vi.fn().mockResolvedValue([
    { slug: 'nome_cliente', label: 'Nome do cliente', group: 'cliente' },
  ]),
  createContractTemplate: vi.fn().mockResolvedValue({
    id: 2,
    name: 'Novo',
    body_markdown: 'Texto',
    custom_variables: [],
    is_active: true,
  }),
}))

vi.mock('@/apps/builder/hooks/use-builder-permissions', () => ({
  useBuilderPermissions: () => ({
    can: (permission: string) => permission === 'contracts.manage',
    permissions: ['contracts.manage'],
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
    listContractTemplates,
    listContractVariables,
    createContractTemplate,
    updateContractTemplate: vi.fn(),
    deleteContractTemplate: vi.fn(),
  },
}))

describe('ContractsPage', () => {
  it('lists templates and creates a new one', async () => {
    const user = userEvent.setup()
    render(<ContractsPage />)

    await waitFor(() => {
      expect(screen.getByText('Compra e venda padrão')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Nome'), 'Promessa')
    await user.click(screen.getByLabelText('Texto (Markdown)'))
    await user.paste('Unidade {{codigo_unidade}}')
    await user.click(screen.getByRole('button', { name: 'Criar modelo' }))

    await waitFor(() => {
      expect(createContractTemplate).toHaveBeenCalledWith({
        name: 'Promessa',
        body_markdown: 'Unidade {{codigo_unidade}}',
        is_active: true,
        custom_variables: [],
      })
    })
  })
})
