import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReservationProgressDialog } from '@/components/reservations/ReservationProgressDialog'
import { formatListedPrice } from '@/lib/unit-listing'

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
      unit: {
        id: 10,
        code: '101',
        status: 'pre_reserved',
        price: '530660',
        building_name: 'Condomínio Jardim Europa',
      },
      garage_units: [{ id: 30, code: 'S1-02', price: '48000', status: 'pre_reserved', floor_kind: 'garage' }],
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

    const listed = (value: string) => (text: string) => text.replace(/\s/g, ' ') === formatListedPrice(value).replace(/\s/g, ' ')

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Andamento da reserva' })).toBeInTheDocument()
      expect(screen.getByText('Proposta em análise')).toBeVisible()
    })

    expect(screen.getByText('Andamento da reserva')).toBeVisible()

    expect(screen.getByLabelText('Unidade da proposta')).toBeInTheDocument()
    expect(screen.getByText('Condomínio Jardim Europa')).toBeInTheDocument()
    expect(screen.getByText('Unidade 101')).toBeInTheDocument()
    expect(screen.getByText('Valor da unidade')).toBeInTheDocument()
    expect(screen.getByText('Vagas vinculadas')).toBeInTheDocument()
    expect(screen.getByText('S1-02')).toBeInTheDocument()
    expect(screen.getByText('Total da proposta')).toBeInTheDocument()
    expect(screen.getByText(listed('530660'))).toBeInTheDocument()
    expect(screen.getByText(listed('48000'))).toBeInTheDocument()
    expect(screen.getByText(listed('578660'))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar valor da unidade' })).not.toBeInTheDocument()
    expect(screen.getByText('101')).toBeInTheDocument()
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
    expect(screen.queryByText('Decisão do gestor')).not.toBeInTheDocument()
    const files = screen.getByRole('complementary', { name: 'Arquivos da reserva' })
    expect(files).toHaveClass('h-[60%]')
    expect(files).toHaveTextContent('Nenhum arquivo enviado ainda')
    expect(files).not.toHaveTextContent('Diálogo')
    expect(screen.getByText('Diálogo').parentElement?.parentElement).toHaveClass('h-[40%]')
    expect(files.compareDocumentPosition(screen.getByText('Diálogo'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.queryByText('Aguardando sinal (48h)')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir diálogo' })).not.toBeInTheDocument()
    expect(listReservationMessages).toHaveBeenCalledWith(1)
    expect(onTimelineRefresh).toHaveBeenCalled()
  })
})
