import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReservationTimeline } from '@/components/reservations/ReservationTimeline'
import type { ReservationTimeline as ReservationTimelineData } from '@/lib/api'

const sampleTimeline: ReservationTimelineData = {
  reservation_id: 1,
  current_stage: 'pre_hold',
  expires_at: '2026-07-10T20:00:00+00:00',
  unit: { id: 10, code: '101', status: 'pre_reserved' },
  steps: [
    {
      key: 'pre_hold_created',
      label: 'Pré-reserva',
      status: 'completed',
      occurred_at: '2026-07-10T19:00:00+00:00',
      due_at: null,
      actor: { id: 2, name: 'João', role: 'broker' },
      actions: [],
    },
    {
      key: 'dialogue',
      label: 'Diálogo com construtora',
      status: 'current',
      occurred_at: null,
      due_at: '2026-07-10T20:00:00+00:00',
      actor: null,
      actions: ['open_dialogue'],
    },
  ],
}

describe('ReservationTimeline', () => {
  it('renders steps and current action button', () => {
    const onAction = vi.fn()

    render(<ReservationTimeline timeline={sampleTimeline} onAction={onAction} />)

    expect(screen.getByText('Pré-reserva')).toBeInTheDocument()
    expect(screen.getByText('Diálogo com construtora')).toBeInTheDocument()
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir diálogo' })).toBeInTheDocument()
  })
})
