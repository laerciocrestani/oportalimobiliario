import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivityPage } from '@/apps/broker/ActivityPage'

const { listActivity, listUnits } = vi.hoisted(() => ({
  listActivity: vi.fn(),
  listUnits: vi.fn(),
}))

vi.mock('@/apps/broker/components/BrokerDashboardShell', () => ({
  BrokerDashboardShell: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  brokerApi: {
    listActivity,
    listUnits,
  },
}))

describe('broker ActivityPage', () => {
  beforeEach(() => {
    listActivity.mockReset()
    listUnits.mockReset()
    listActivity.mockResolvedValue({
      data: [
        {
          id: 4,
          action: 'client.created',
          message: 'Cadastrou o cliente Ana Silva, telefone 11999999999.',
          resource_type: 'client',
          resource_id: 8,
          old_values: null,
          new_values: null,
          tenant_id: 1,
          actor_user_id: 3,
          actor: { id: 3, name: 'Corretor', email: 'corretor@demo.com' },
          impersonator_user_id: null,
          impersonated_user_id: null,
          created_at: '2026-08-19T18:00:00.000Z',
        },
      ],
      current_page: 1,
      last_page: 1,
    })
    listUnits.mockResolvedValue([
      {
        id: 11,
        code: '101',
        floor: 1,
        area_m2: null,
        price: null,
        status: 'available',
        building: {
          id: 2,
          name: 'Aurora',
          tenant: { id: 1, name: 'Construtora Alpha' },
        },
      },
    ])
  })

  it('loads the own activity log and filters by tenant', async () => {
    const user = userEvent.setup()
    render(<ActivityPage />)

    await waitFor(() => {
      expect(screen.getByText('Cadastrou o cliente Ana Silva, telefone 11999999999.')).toBeInTheDocument()
    })

    expect(listActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: undefined,
        page: 1,
      }),
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Construtora')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('combobox', { name: 'Construtora' }))
    await user.click(await screen.findByRole('option', { name: 'Construtora Alpha' }))
    await user.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => {
      expect(listActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 1,
          page: 1,
        }),
      )
    })
  })
})
