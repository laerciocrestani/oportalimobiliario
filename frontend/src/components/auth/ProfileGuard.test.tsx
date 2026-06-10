import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfileGuard } from '@/components/auth/ProfileGuard'
import * as api from '@/lib/api'

function renderGuard(profile: 'builder' | 'broker' | 'admin') {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <ProfileGuard profile={profile}>
              <div>Protected content</div>
            </ProfileGuard>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProfileGuard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects to login when token is missing', async () => {
    vi.spyOn(api, 'getToken').mockReturnValue(null)

    renderGuard('builder')

    await waitFor(() => {
      expect(screen.getByText('Login page')).toBeInTheDocument()
    })
  })

  it('renders children when role matches profile', async () => {
    vi.spyOn(api, 'getToken').mockReturnValue('token')
    vi.spyOn(api, 'fetchMe').mockResolvedValue({
      id: 1,
      name: 'Demo',
      email: 'demo@test.com',
      role: 'builder',
      tenant_id: 1,
    })

    renderGuard('builder')

    await waitFor(() => {
      expect(screen.getByText('Protected content')).toBeInTheDocument()
    })
  })

  it('redirects to login when role does not match profile', async () => {
    vi.spyOn(api, 'getToken').mockReturnValue('token')
    vi.spyOn(api, 'fetchMe').mockResolvedValue({
      id: 1,
      name: 'Demo',
      email: 'demo@test.com',
      role: 'broker',
      tenant_id: null,
    })
    const clearToken = vi.spyOn(api, 'clearToken').mockImplementation(() => {})

    renderGuard('builder')

    await waitFor(() => {
      expect(screen.getByText('Login page')).toBeInTheDocument()
    })

    expect(clearToken).toHaveBeenCalled()
  })
})
