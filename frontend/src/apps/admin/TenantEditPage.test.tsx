import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TenantEditPage } from '@/apps/admin/TenantEditPage'
import * as api from '@/lib/api'

describe('TenantEditPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads tenant and submits update', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.adminApi, 'getTenant').mockResolvedValue({
      id: 1,
      name: 'Alpha',
      slug: 'alpha',
      active: true,
      users_count: 2,
    })
    const updateSpy = vi.spyOn(api.adminApi, 'updateTenant').mockResolvedValue({
      id: 1,
      name: 'Alpha Atualizada',
      slug: 'alpha-atualizada',
      active: true,
    })

    render(
      <MemoryRouter initialEntries={['/tenants/1/edit']}>
        <Routes>
          <Route path="/tenants/:tenantId/edit" element={<TenantEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Alpha')).toBeInTheDocument()
      expect(screen.getByText('2 usuário(s) na equipe')).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Alpha Atualizada')
    await user.clear(screen.getByLabelText('Slug'))
    await user.type(screen.getByLabelText('Slug'), 'alpha-atualizada')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(1, {
        name: 'Alpha Atualizada',
        slug: 'alpha-atualizada',
        active: true,
      })
      expect(screen.getByText('Construtora salva com sucesso.')).toBeInTheDocument()
    })
  })
})
