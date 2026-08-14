import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReservationMessagesDialog } from '@/apps/builder/components/ReservationMessagesDialog'

vi.mock('@/lib/api', () => ({
  builderApi: {
    listReservationMessages: vi.fn(),
    replyReservation: vi.fn(),
  },
  brokerApi: {
    listReservationMessages: vi.fn(),
    replyReservation: vi.fn(),
  },
}))

import { builderApi } from '@/lib/api'

describe('ReservationMessagesDialog', () => {
  it('opens a chat panel in the bottom right and shows messages', async () => {
    vi.mocked(builderApi.listReservationMessages).mockResolvedValue([
      {
        id: 1,
        body: 'Cliente prefere canto.',
        created_at: '2026-06-12T10:00:00.000000Z',
        author: { id: 2, name: 'Corretor Alpha', role: 'broker' },
      },
    ])

    render(
      <ReservationMessagesDialog
        profile="builder"
        reservationId={5}
        open
        onOpenChange={() => {}}
      />,
    )

    await waitFor(() => {
      expect(builderApi.listReservationMessages).toHaveBeenCalledWith(5)
      expect(screen.getByText('Cliente prefere canto.')).toBeInTheDocument()
      expect(screen.getByText('Corretor Alpha')).toBeInTheDocument()
    })

    const dialog = screen.getByRole('dialog', { name: 'Conversa da reserva' })
    expect(dialog).toHaveClass('right-4', 'bottom-4')
    expect(screen.getByLabelText('Mensagens da reserva')).toBeInTheDocument()
    expect(screen.getByText('Cliente prefere canto.').closest('[data-slot="message"]')).toHaveAttribute(
      'data-align',
      'start',
    )
  })

  it('sends a reply as an outgoing chat bubble', async () => {
    const user = userEvent.setup()

    vi.mocked(builderApi.listReservationMessages).mockResolvedValue([])
    vi.mocked(builderApi.replyReservation).mockResolvedValue({
      id: 2,
      body: 'Resposta da construtora',
      created_at: '2026-06-12T11:00:00.000000Z',
      author: { id: 1, name: 'Builder Demo', role: 'builder' },
    })

    render(
      <ReservationMessagesDialog
        profile="builder"
        reservationId={5}
        open
        onOpenChange={() => {}}
      />,
    )

    await waitFor(() => {
      expect(builderApi.listReservationMessages).toHaveBeenCalled()
      expect(screen.getByText('Nenhuma mensagem ainda')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Sua mensagem'), 'Resposta da construtora')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => {
      expect(builderApi.replyReservation).toHaveBeenCalledWith(5, 'Resposta da construtora')
      expect(screen.getByText('Resposta da construtora')).toBeInTheDocument()
      expect(screen.getByText('Builder Demo')).toBeInTheDocument()
    })

    expect(screen.getByText('Resposta da construtora').closest('[data-slot="message"]')).toHaveAttribute(
      'data-align',
      'end',
    )
  })
})
