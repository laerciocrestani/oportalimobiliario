import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { JoinAcceptPage } from '@/apps/broker/JoinAcceptPage'
import { ApiRequestError } from '@/lib/api'

const { previewJoinLink, registerViaJoinLink, resendIndividualInviteFromJoin, toastMock } = vi.hoisted(() => ({
  previewJoinLink: vi.fn().mockResolvedValue({
    tenant_name: 'Alpha Corp',
    type: 'open',
  }),
  registerViaJoinLink: vi.fn().mockResolvedValue({
    token: 'api-token',
    pending_approval: true,
    user: { id: 1, name: 'Corretor', email: null, role: 'broker', tenant_id: null },
  }),
  resendIndividualInviteFromJoin: vi.fn().mockResolvedValue({
    channel: 'email',
    message: 'Convite reenviado para o seu e-mail.',
  }),
  toastMock: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    dismiss: vi.fn(),
  }),
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()

  return {
    ...actual,
    brokerApi: {
      previewJoinLink,
      registerViaJoinLink,
      resendIndividualInviteFromJoin,
    },
    saveToken: vi.fn(),
  }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/join/demo-token']}>
      <Routes>
        <Route path="/join/:token" element={<JoinAcceptPage />} />
        <Route path="/pending-approval" element={<div>Pending</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('JoinAcceptPage', () => {
  it('shows join form and submits registration', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Alpha Corp/)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Nome completo'), 'Corretor Demo')
    await user.type(screen.getByLabelText('Telefone (WhatsApp)'), '11999998888')
    await user.type(screen.getByLabelText('E-mail'), 'corretor@demo.com')
    await user.type(screen.getByLabelText('Senha'), 'password123')
    await user.type(screen.getByLabelText('Confirmar senha'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Solicitar acesso' }))

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })
  })

  it('shows resend invite toast when individual invite already exists', async () => {
    const user = userEvent.setup()
    toastMock.mockClear()
    toastMock.success.mockClear()
    toastMock.loading.mockClear()
    registerViaJoinLink.mockRejectedValueOnce(
      new ApiRequestError('Validation error', 422, {
        email: [
          'Você já recebeu um convite individual. Acesse o link enviado por e-mail ou WhatsApp.',
        ],
        invite_resend: ['1'],
      }),
    )

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Alpha Corp/)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Nome completo'), 'Corretor Demo')
    await user.type(screen.getByLabelText('Telefone (WhatsApp)'), '11999998888')
    await user.type(screen.getByLabelText('E-mail'), 'novo.corretor@demo.com')
    await user.type(screen.getByLabelText('Senha'), 'password123')
    await user.type(screen.getByLabelText('Confirmar senha'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Solicitar acesso' }))

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Não encontrou o link? Reenviamos o convite individual para o canal original.',
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Reenviar convite',
          }),
        }),
      )
    })

    const toastOptions = toastMock.mock.calls[0]?.[1] as { action: { onClick: () => void } }
    toastOptions.action.onClick()

    await waitFor(() => {
      expect(resendIndividualInviteFromJoin).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'demo-token',
          email: 'novo.corretor@demo.com',
        }),
      )
      expect(toastMock.success).toHaveBeenCalledWith('Convite reenviado para o seu e-mail.', {
        id: 'toast-id',
      })
    })
  })
})
