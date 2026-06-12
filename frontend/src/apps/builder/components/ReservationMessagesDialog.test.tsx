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

const longMessageBody = `${'A'.repeat(200)} mensagem longa com mais detalhes.`

describe('ReservationMessagesDialog', () => {
  it('loads and displays messages for builder', async () => {
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
      expect(screen.getByText('Recebido por Corretor Alpha')).toBeInTheDocument()
    })
  })

  it('shows read more button and opens full message dialog for long messages', async () => {
    const user = userEvent.setup()

    vi.mocked(builderApi.listReservationMessages).mockResolvedValue([
      {
        id: 3,
        body: longMessageBody,
        created_at: '2026-06-12T12:00:00.000000Z',
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
      expect(screen.getByRole('button', { name: 'Leia mais' })).toBeInTheDocument()
    })

    expect(screen.queryByText(longMessageBody)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Leia mais' }))

    await waitFor(() => {
      expect(screen.getByText(longMessageBody)).toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Corretor Alpha' })).toBeInTheDocument()
    })
  })

  it('sends a reply message', async () => {
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
    })

    await user.type(screen.getByLabelText('Sua mensagem'), 'Resposta da construtora')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => {
      expect(builderApi.replyReservation).toHaveBeenCalledWith(5, 'Resposta da construtora')
      expect(screen.getByText('Resposta da construtora')).toBeInTheDocument()
      expect(screen.getByText('Enviado por Builder Demo')).toBeInTheDocument()
    })
  })
})
