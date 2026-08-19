import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivityPage } from '@/apps/builder/ActivityPage'

const permissionsRef = vi.hoisted(() => ({
  current: ['buildings.view'] as string[],
  user: { id: 10, name: 'Builder', email: 'builder@demo.com' },
}))

const { listActivity, listActivityMembers } = vi.hoisted(() => ({
  listActivity: vi.fn(),
  listActivityMembers: vi.fn(),
}))

vi.mock('@/apps/builder/hooks/use-builder-permissions', () => ({
  useBuilderPermissions: () => ({
    can: (permission: string) => permissionsRef.current.includes(permission),
    permissions: permissionsRef.current,
    loading: false,
    user: permissionsRef.user,
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
    listActivity,
    listActivityMembers,
  },
}))

describe('ActivityPage', () => {
  beforeEach(() => {
    permissionsRef.current = ['buildings.view']
    listActivity.mockReset()
    listActivityMembers.mockReset()
    listActivity.mockResolvedValue({
      data: [
        {
          id: 1,
          action: 'building.created',
          message: 'Cadastrou o empreendimento Aurora.',
          resource_type: 'building',
          resource_id: 9,
          old_values: null,
          new_values: null,
          tenant_id: 1,
          actor_user_id: 10,
          actor: permissionsRef.user,
          impersonator_user_id: null,
          impersonated_user_id: null,
          created_at: '2026-08-19T18:00:00.000Z',
        },
      ],
      current_page: 1,
      last_page: 1,
    })
    listActivityMembers.mockResolvedValue([
      permissionsRef.user,
      { id: 22, name: 'Maria Gestora', email: 'maria@alpha.demo' },
    ])
  })

  it('loads the own activity log for the default date range', async () => {
    render(<ActivityPage />)

    await waitFor(() => {
      expect(screen.getByText('Cadastrou o empreendimento Aurora.')).toBeInTheDocument()
    })

    expect(listActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        user_id: undefined,
        page: 1,
      }),
    )
    expect(screen.queryByLabelText('Membro')).not.toBeInTheDocument()
    expect(listActivityMembers).not.toHaveBeenCalled()
  })

  it('lets a manager with audit.view filter another teammate', async () => {
    const user = userEvent.setup()
    permissionsRef.current = ['buildings.view', 'audit.view']

    render(<ActivityPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Membro')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('combobox', { name: 'Membro' }))
    await user.click(await screen.findByRole('option', { name: 'Maria Gestora' }))
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => {
      expect(listActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 22,
          page: 1,
        }),
      )
    })
  })
})
