import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { NavUser } from '@/components/nav-user'
import { SidebarProvider } from '@/components/ui/sidebar'
import * as api from '@/lib/api'

function renderNavUser() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <NavUser
          user={{
            name: 'Demo User',
            email: 'demo@test.com',
          }}
        />
      </SidebarProvider>
    </MemoryRouter>,
  )
}

describe('NavUser', () => {
  it('logs out and redirects to login', async () => {
    const user = userEvent.setup()
    const logout = vi.spyOn(api, 'logout').mockResolvedValue()

    renderNavUser()

    await user.click(screen.getByRole('button', { name: /Demo User/i }))

    await waitFor(() => {
      expect(screen.getByText('Sair')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Sair'))

    await waitFor(() => {
      expect(logout).toHaveBeenCalledOnce()
    })
  })
})
