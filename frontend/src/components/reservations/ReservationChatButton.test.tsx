import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReservationChatButton } from '@/components/reservations/ReservationChatButton'

describe('ReservationChatButton', () => {
  it('opens chat from the row and marks unread replies', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<ReservationChatButton label="Corretor Alpha" needsReply onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: 'Conversar — Corretor Alpha · nova' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
