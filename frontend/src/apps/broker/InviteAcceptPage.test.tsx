import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { InviteAcceptPage } from '@/apps/broker/InviteAcceptPage'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    previewInvite: vi.fn().mockResolvedValue({
      name: 'Corretor Demo',
      email: 'corretor@demo.com',
      requires_email: false,
      tenant_name: 'Alpha Corp',
      status: 'pending',
      expires_at: '2026-12-31T00:00:00Z',
    }),
    acceptInvite: vi.fn().mockResolvedValue({
      token: 'api-token',
      user: { id: 1, name: 'Corretor', email: 'corretor@demo.com', role: 'broker', tenant_id: null },
    }),
  },
  saveToken: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/invite/demo-token']}>
      <Routes>
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InviteAcceptPage', () => {
  it('shows invite preview and accepts registration', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Alpha Corp/)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Nome completo'), 'Corretor Demo')
    await user.type(screen.getByLabelText('Senha'), 'password123')
    await user.type(screen.getByLabelText('Confirmar senha'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Aceitar convite e entrar' }))

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument()
    })
  })
})
