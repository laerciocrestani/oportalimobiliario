import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReservationProgressDialog } from '@/components/reservations/ReservationProgressDialog'

const getReservationTimeline = vi.fn()
const listReservationMessages = vi.fn()

vi.mock('@/lib/api', () => ({
  builderApi: {
    getReservationTimeline: (...args: unknown[]) => getReservationTimeline(...args),
    listReservationMessages: (...args: unknown[]) => listReservationMessages(...args),
    replyReservation: vi.fn(),
  },
  brokerApi: {
    getReservationTimeline: vi.fn(),
    listReservationMessages: vi.fn(),
    replyReservation: vi.fn(),
  },
}))

describe('ReservationProgressDialog', () => {
  it('embeds the chat and hides stages that belong to other kanban columns', async () => {
    getReservationTimeline.mockResolvedValue({
      reservation_id: 1,
      current_stage: 'proposal_pending',
      expires_at: null,
      unit: { id: 10, code: '101', status: 'pre_reserved' },
      deposit_overdue: false,
      client: { id: 1, name: 'João Silva', phone: '11999999999', email: null },
      current_proposal: null,
      current_deposit_proof: null,
      current_signed_contract: null,
      current_builder_signed_contract: null,
      witnesses: [],
      attachments: [],
      steps: [
        {
          key: 'proposal_decision',
          label: 'Decisão do gestor',
          status: 'current',
          occurred_at: null,
          due_at: null,
          actor: null,
          actions: ['open_dialogue'],
        },
        {
          key: 'deposit_window',
          label: 'Aguardando sinal (48h)',
          status: 'upcoming',
          occurred_at: null,
          due_at: null,
          actor: null,
          actions: [],
        },
      ],
    })
    listReservationMessages.mockResolvedValue([])

    const onTimelineRefresh = vi.fn()

    render(
      <ReservationProgressDialog
        profile="builder"
        reservationId={1}
        open
        onOpenChange={() => {}}
        onTimelineRefresh={onTimelineRefresh}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Andamento da reserva' })).toBeInTheDocument()
      expect(screen.getByText('Proposta em análise')).toBeInTheDocument()
      expect(screen.getByText('Decisão do gestor')).toBeInTheDocument()
    })

    expect(screen.getByText('Diálogo')).toBeInTheDocument()
    expect(screen.getByText('Arquivos da reserva')).toBeInTheDocument()
    expect(screen.getByText('Nenhum arquivo enviado ainda')).toBeInTheDocument()
    expect(screen.queryByText('Aguardando sinal (48h)')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir diálogo' })).not.toBeInTheDocument()
    expect(listReservationMessages).toHaveBeenCalledWith(1)
    expect(onTimelineRefresh).toHaveBeenCalled()
  })
})
