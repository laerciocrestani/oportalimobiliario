import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReservationSituation } from '@/components/reservations/ReservationSituation'

describe('ReservationSituation', () => {
  it('renders chevron steps with status and timestamp', () => {
    render(
      <ReservationSituation
        situation={{
          previous: {
            key: 'proposal_decision',
            label: 'Decisão do gestor',
            occurred_at: '2026-07-10T19:00:00.000Z',
          },
          current: {
            key: 'deposit_window',
            label: 'Aguardando sinal (48h)',
            status: 'current',
            waiting_on: 'broker',
            occurred_at: '2026-07-10T19:30:00.000Z',
          },
          next: {
            key: 'deposit_proof',
            label: 'Comprovante de pagamento',
            occurred_at: null,
          },
        }}
      />,
    )

    const group = screen.getByLabelText(
      'Situação: Decisão do gestor → Aguardando sinal (48h) → Comprovante de pagamento',
    )
    expect(group).toBeInTheDocument()
    expect(group.children[0]).toHaveClass('rounded-l-lg', 'flex-1')
    expect(group.children[1]).toHaveClass('-ml-2.5', 'flex-[2]')
    expect(group.children[1]).not.toHaveClass('rounded-l-lg', 'rounded-r-lg')
    expect(group.children[2]).toHaveClass('rounded-r-lg', '-ml-2.5', 'flex-1')
    expect(group.children[0].firstElementChild).toHaveClass('bg-emerald-300', 'text-[11px]')
    expect(group.children[1].firstElementChild).toHaveClass('bg-emerald-400', 'situation-active-glow', 'text-sm')
    expect(group.children[0].firstElementChild).not.toHaveClass('situation-active-glow')
    expect(group.children[2].firstElementChild).toHaveClass('bg-muted', 'text-muted-foreground', 'text-[11px]')
    expect(group.children[2].firstElementChild).not.toHaveClass('bg-emerald-500')
    expect(screen.getByRole('progressbar', { name: 'Progresso 5 de 13' })).toHaveClass(
      '[&_[data-slot=progress-indicator]]:bg-emerald-400',
    )
    expect(screen.queryByText('5/13')).not.toBeInTheDocument()
    expect(screen.queryByText('42%')).not.toBeInTheDocument()
    expect(screen.getByText('Decisão do gestor')).toBeInTheDocument()
    expect(screen.getByText('Aguardando sinal (48h)')).toBeInTheDocument()
    expect(screen.getByText('Comprovante de pagamento')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    expect(screen.queryByText('Aguardando corretor')).not.toBeInTheDocument()
    expect(screen.getAllByText(/\d{2}\/\d{2}\/\d{4}/).length).toBeGreaterThanOrEqual(2)
  })

  it('opens the timeline sheet from the active chevron', async () => {
    const user = userEvent.setup()
    const onOpenTimeline = vi.fn()

    render(
      <ReservationSituation
        onOpenTimeline={onOpenTimeline}
        situation={{
          previous: {
            key: 'proposal_submitted',
            label: 'Proposta enviada',
            occurred_at: '2026-07-10T18:00:00.000Z',
          },
          current: {
            key: 'proposal_decision',
            label: 'Decisão do gestor',
            status: 'current',
            waiting_on: 'builder',
            occurred_at: '2026-07-10T19:00:00.000Z',
          },
          next: {
            key: 'deposit_window',
            label: 'Aguardando sinal (48h)',
            occurred_at: null,
          },
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Abrir andamento — Decisão do gestor' }))
    expect(onOpenTimeline).toHaveBeenCalledOnce()
  })

  it('rounds both sides when there is a single step', () => {
    render(
      <ReservationSituation
        situation={{
          previous: null,
          current: {
            key: 'pre_hold_created',
            label: 'Pré-reserva criada',
            status: 'current',
            waiting_on: 'broker',
            occurred_at: '2026-07-10T18:00:00.000Z',
          },
          next: null,
        }}
      />,
    )

    const group = screen.getByLabelText('Situação: Pré-reserva criada')
    expect(group.children[0]).toHaveClass('rounded-l-lg', 'rounded-r-lg')
    expect(group.children[0].firstElementChild).toHaveClass('bg-emerald-50')
  })

  it('highlights a failed current step', () => {
    render(
      <ReservationSituation
        situation={{
          previous: {
            key: 'proposal_submitted',
            label: 'Proposta enviada',
            occurred_at: '2026-07-10T18:00:00.000Z',
          },
          current: {
            key: 'proposal_decision',
            label: 'Decisão do gestor',
            status: 'failed',
            waiting_on: null,
            occurred_at: '2026-07-10T19:00:00.000Z',
          },
          next: {
            key: 'deposit_window',
            label: 'Aguardando sinal (48h)',
            occurred_at: null,
          },
        }}
      />,
    )

    expect(screen.getByText('Decisão do gestor')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    expect(screen.getByText('Decisão do gestor').closest('div')).toHaveClass('bg-destructive')
  })
})
