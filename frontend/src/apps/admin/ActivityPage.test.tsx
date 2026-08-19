import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivityPage } from '@/apps/admin/ActivityPage'

const { listActivity, exportActivity } = vi.hoisted(() => ({
  listActivity: vi.fn(),
  exportActivity: vi.fn(),
}))

vi.mock('@/components/layout/DashboardShell', () => ({
  DashboardShell: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  adminApi: {
    listActivity,
    exportActivity,
  },
}))

describe('admin ActivityPage', () => {
  beforeEach(() => {
    listActivity.mockReset()
    exportActivity.mockReset()
    listActivity.mockResolvedValue({
      data: [
        {
          id: 9,
          action: 'tenant.created',
          message: 'Cadastrou a construtora Nova (slug nova, ativa).',
          resource_type: 'tenant',
          resource_id: 4,
          old_values: null,
          new_values: null,
          tenant_id: 4,
          actor_user_id: 1,
          actor: { id: 1, name: 'Admin SaaS', email: 'admin@demo.com' },
          impersonator_user_id: null,
          impersonated_user_id: null,
          created_at: '2026-08-19T18:00:00.000Z',
        },
      ],
      current_page: 1,
      last_page: 1,
    })
    exportActivity.mockResolvedValue(new Blob(['csv'], { type: 'text/csv' }))
  })

  it('lists events and exports CSV with the current filters', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:activity')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<ActivityPage />)

    await waitFor(() => {
      expect(screen.getByText('Cadastrou a construtora Nova (slug nova, ativa).')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Usuário (id)'), '12')
    await user.type(screen.getByLabelText('Tenant (id)'), '4')
    await user.type(screen.getByLabelText('Action'), 'tenant.created')
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => {
      expect(listActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 12,
          tenant_id: 4,
          action: 'tenant.created',
          page: 1,
        }),
      )
    })

    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))

    await waitFor(() => {
      expect(exportActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 12,
          tenant_id: 4,
          action: 'tenant.created',
        }),
      )
    })
    expect(createObjectURL).toHaveBeenCalled()
  })
})
