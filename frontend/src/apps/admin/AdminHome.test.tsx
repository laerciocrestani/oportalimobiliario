import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminHome } from '@/apps/admin/AdminHome'
import * as api from '@/lib/api'

describe('AdminHome', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api.adminApi, 'listTenants').mockResolvedValue({
      data: [
        { id: 1, name: 'Alpha', slug: 'alpha', active: true },
        { id: 2, name: 'Beta', slug: 'beta', active: false },
      ],
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 2,
    })
  })

  it('lists tenants with edit and impersonate actions', async () => {
    render(
      <MemoryRouter>
        <AdminHome />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: 'Editar' })[0]).toHaveAttribute('href', '/tenants/1/edit')
    })

    expect(screen.getAllByRole('button', { name: 'Acessar como construtora' })[0]).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Desativar' })).toBeInTheDocument()
  })

  it('opens impersonate dialog and loads tenant users', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.adminApi, 'listTenantUsers').mockResolvedValue([
      {
        id: 10,
        name: 'Gestor Alpha',
        email: 'gestor@alpha.demo',
        permissions: ['buildings.view'],
      },
    ])
    vi.spyOn(api.adminApi, 'impersonateTenant').mockResolvedValue({
      redirect_url: 'http://construtora.localhost:5173/auth/impersonate?code=test-code',
      expires_in: 60,
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(
      <MemoryRouter>
        <AdminHome />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument()
    })

    await user.click(screen.getAllByRole('button', { name: 'Acessar como construtora' })[0])

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Acessar como construtora' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Acessar' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Acessar' }))

    await waitFor(() => {
      expect(api.adminApi.impersonateTenant).toHaveBeenCalledWith(1, 10)
      expect(openSpy).toHaveBeenCalledWith(
        'http://construtora.localhost:5173/auth/impersonate?code=test-code',
        '_blank',
        'noopener,noreferrer',
      )
    })
  })
})
