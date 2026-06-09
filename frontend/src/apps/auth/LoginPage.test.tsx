import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/apps/auth/LoginPage'
import * as api from '@/lib/api'

describe('LoginPage', () => {
  it('submits login form successfully when role matches portal', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'login').mockResolvedValue({
      token: 'demo-token',
      user: {
        id: 1,
        name: 'Demo',
        email: 'demo@test.com',
        role: 'construtora',
        tenant_id: 1,
      },
    })
    const saveToken = vi.spyOn(api, 'saveToken').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <LoginPage profile="construtora" />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('E-mail'), 'demo@test.com')
    await user.type(screen.getByLabelText('Senha'), 'password')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(api.login).toHaveBeenCalledWith('demo@test.com', 'password')
    expect(saveToken).toHaveBeenCalledWith('demo-token')
  })

  it('shows error when role does not match portal', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'login').mockResolvedValue({
      token: 'demo-token',
      user: {
        id: 1,
        name: 'Demo',
        email: 'demo@test.com',
        role: 'corretor',
        tenant_id: null,
      },
    })
    const saveToken = vi.spyOn(api, 'saveToken').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <LoginPage profile="construtora" />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('E-mail'), 'demo@test.com')
    await user.type(screen.getByLabelText('Senha'), 'password')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(screen.getByText('Conta não autorizada neste portal.')).toBeInTheDocument()
    })

    expect(saveToken).not.toHaveBeenCalled()
  })
})
