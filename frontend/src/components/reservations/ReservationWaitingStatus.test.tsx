import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReservationWaitingStatus } from '@/components/reservations/ReservationWaitingStatus'

describe('ReservationWaitingStatus', () => {
  it('shows a warning badge when the current profile is being waited on', () => {
    render(<ReservationWaitingStatus waitingOn="builder" profile="builder" />)

    const badge = screen.getByText('Aguardando você').closest('[data-slot="badge"]')
    expect(badge).toBeInTheDocument()
    expect(screen.queryByText('Aguardando construtora')).not.toBeInTheDocument()
  })

  it('shows the default broker label when another profile is viewing', () => {
    render(<ReservationWaitingStatus waitingOn="broker" profile="builder" />)

    expect(screen.getByText('Aguardando corretor')).toBeInTheDocument()
    expect(screen.queryByText('Aguardando você')).not.toBeInTheDocument()
  })

  it('shows the default builder label when the broker is waiting on the builder', () => {
    render(<ReservationWaitingStatus waitingOn="builder" profile="broker" />)

    expect(screen.getByText('Aguardando construtora')).toBeInTheDocument()
    expect(screen.queryByText('Aguardando você')).not.toBeInTheDocument()
  })

  it('shows a warning badge when the broker is being waited on', () => {
    render(<ReservationWaitingStatus waitingOn="broker" profile="broker" />)

    expect(screen.getByText('Aguardando você')).toBeInTheDocument()
    expect(screen.queryByText('Aguardando corretor')).not.toBeInTheDocument()
  })

  it('shows an empty placeholder when nobody is waiting', () => {
    render(<ReservationWaitingStatus waitingOn={null} profile="builder" />)

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('Aguardando você')).not.toBeInTheDocument()
  })
})
