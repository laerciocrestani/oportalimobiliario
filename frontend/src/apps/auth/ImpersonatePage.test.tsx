import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImpersonatePage } from '@/apps/auth/ImpersonatePage'
import * as api from '@/lib/api'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

describe('ImpersonatePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    navigateMock.mockReset()
    localStorage.clear()
  })

  it('exchanges code and stores token', async () => {
    const exchangeSpy = vi.spyOn(api, 'exchangeImpersonationCode').mockResolvedValue({
      token: 'builder-token',
      user: {
        id: 10,
        name: 'Gestor',
        email: 'gestor@alpha.demo',
        role: 'builder',
        tenant_id: 1,
      },
    })

    render(
      <MemoryRouter initialEntries={['/auth/impersonate?code=550e8400-e29b-41d4-a716-446655440000']}>
        <Routes>
          <Route path="/auth/impersonate" element={<ImpersonatePage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(exchangeSpy).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000')
      expect(api.getToken()).toBe('builder-token')
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('shows error when code is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/impersonate']}>
        <Routes>
          <Route path="/auth/impersonate" element={<ImpersonatePage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Link de acesso inválido.')).toBeInTheDocument()
    })
  })
})
