import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReservationPendingActionBadge } from '@/components/reservations/ReservationPendingActionBadge'

describe('ReservationPendingActionBadge', () => {
  it('renders the pending action label', () => {
    render(<ReservationPendingActionBadge pendingAction="witness_signature" />)

    expect(screen.getByText('Assinatura pendente')).toBeInTheDocument()
  })

  it('renders nothing when there is no pending action', () => {
    const { container } = render(<ReservationPendingActionBadge pendingAction={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
