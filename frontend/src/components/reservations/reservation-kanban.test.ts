import { describe, expect, it } from 'vitest'
import {
  BadgeCheckIcon,
  BanIcon,
  KeyRoundIcon,
  MessagesSquareIcon,
  PenLineIcon,
  ScaleIcon,
  WalletIcon,
} from 'lucide-react'
import {
  RESERVATION_KANBAN_COLUMNS,
  clientInitials,
  kanbanProcessHint,
  resolveKanbanCardCta,
  resolveKanbanDrop,
  timelineKanbanColumn,
  visibleColumnActions,
} from '@/components/reservations/reservation-kanban'
import type { ReservationAttachment, ReservationTimeline } from '@/lib/api'

describe('RESERVATION_KANBAN_COLUMNS', () => {
  it('maps every kanban column to a lucide icon', () => {
    expect(RESERVATION_KANBAN_COLUMNS).toHaveLength(7)
    expect(RESERVATION_KANBAN_COLUMNS.map((column) => [column.id, column.icon])).toEqual([
      ['pre_reservation', MessagesSquareIcon],
      ['proposal_review', ScaleIcon],
      ['proposal_formalization', BadgeCheckIcon],
      ['docs_deposit', WalletIcon],
      ['contract', PenLineIcon],
      ['sold', KeyRoundIcon],
      ['cancelled', BanIcon],
    ])
    expect(RESERVATION_KANBAN_COLUMNS.every((column) => column.theme && column.emptyDescription)).toBe(true)
  })

  it('builds initials from the client name', () => {
    expect(clientInitials('Emma Santana')).toBe('ES')
    expect(clientInitials('Edigi')).toBe('ED')
  })

  it('explains the process that blocks a kanban drop', () => {
    expect(kanbanProcessHint('reply')).toBe('Há uma mensagem aguardando sua resposta.')
    expect(kanbanProcessHint('start_dialogue')).toBe('Inicie o diálogo com a construtora.')
    expect(kanbanProcessHint('decide_proposal')).toBe('É necessário responder a proposta do cliente.')
    expect(kanbanProcessHint(null)).toBe(
      'Abra o andamento da reserva e conclua a etapa atual para avançar.',
    )
  })

  it('keeps cancel and sold as real moves and treats other drops as process required', () => {
    const reservation = {
      kanban_column: 'proposal_review' as const,
      allowed_kanban_moves: ['cancelled', 'proposal_formalization'] as const,
    }

    expect(resolveKanbanDrop(reservation, 'proposal_review')).toBe('ignore')
    expect(resolveKanbanDrop(reservation, 'cancelled')).toBe('move')
    expect(resolveKanbanDrop(reservation, 'proposal_formalization')).toBe('process_required')
    expect(resolveKanbanDrop({ ...reservation, allowed_kanban_moves: ['sold'] }, 'sold')).toBe('move')
  })

  it('resolves card CTA labels by column and waiting queue', () => {
    const situation = {
      previous: null,
      current: {
        key: 'dialogue',
        label: 'Diálogo',
        status: 'current' as const,
        waiting_on: 'broker' as const,
        occurred_at: null,
      },
      next: null,
    }

    expect(
      resolveKanbanCardCta(
        {
          kanban_column: 'pre_reservation',
          needs_action: true,
          pending_action: 'reply',
          status: 'pre_hold',
          situation,
        },
        'broker',
      ),
    ).toEqual({
      hint: 'Há uma mensagem aguardando sua resposta.',
      label: 'Responder',
      interactive: true,
    })

    expect(
      resolveKanbanCardCta(
        {
          kanban_column: 'proposal_review',
          needs_action: true,
          pending_action: 'proposal_decision',
          status: 'proposal_pending',
          situation: {
            ...situation,
            current: { ...situation.current, waiting_on: 'builder', key: 'proposal_decision' },
          },
        },
        'builder',
      ),
    ).toEqual({
      hint: 'É necessário responder a proposta do cliente.',
      label: 'Aguardando você',
      interactive: true,
    })

    expect(
      resolveKanbanCardCta(
        {
          kanban_column: 'proposal_review',
          needs_action: false,
          pending_action: null,
          status: 'proposal_pending',
          situation: {
            ...situation,
            current: { ...situation.current, waiting_on: 'builder', key: 'proposal_decision' },
          },
        },
        'broker',
      ),
    ).toEqual({
      hint: 'A construtora está analisando a proposta.',
      interactive: false,
    })

    expect(
      resolveKanbanCardCta(
        {
          kanban_column: 'proposal_review',
          needs_action: true,
          pending_action: 'reply',
          status: 'proposal_pending',
          situation: {
            ...situation,
            current: { ...situation.current, waiting_on: 'builder', key: 'proposal_decision' },
          },
        },
        'broker',
      ),
    ).toEqual({
      hint: 'A construtora está analisando a proposta.',
      interactive: false,
    })

    expect(
      resolveKanbanCardCta(
        {
          kanban_column: 'pre_reservation',
          needs_action: false,
          pending_action: null,
          status: 'pre_hold',
          situation,
        },
        'builder',
      ),
    ).toEqual({
      hint: 'O corretor precisa continuar o diálogo ou enviar a proposta.',
      interactive: false,
    })
  })
})

function timeline(
  stage: string,
  attachments: Array<Pick<ReservationAttachment, 'kind'>> = [],
): Pick<ReservationTimeline, 'current_stage' | 'attachments'> {
  return {
    current_stage: stage,
    attachments: attachments.map((attachment, index) => ({
      id: index + 1,
      kind: attachment.kind,
      original_name: `${attachment.kind}.pdf`,
      mime_type: 'application/pdf',
      size_bytes: 1,
      uploaded_by: 1,
      created_at: null,
      file_url: '/file',
    })),
  }
}

describe('timelineKanbanColumn', () => {
  it('maps stages onto the kanban columns used by the board', () => {
    expect(timelineKanbanColumn(timeline('pre_hold'))).toBe('pre_reservation')
    expect(timelineKanbanColumn(timeline('proposal_pending'))).toBe('proposal_review')
    expect(timelineKanbanColumn(timeline('proposal_returned'))).toBe('proposal_review')
    expect(
      timelineKanbanColumn(timeline('deposit_pending', [{ kind: 'proposal_signed_builder' }])),
    ).toBe('proposal_formalization')
    expect(timelineKanbanColumn(timeline('deposit_proof_pending'))).toBe('docs_deposit')
    expect(timelineKanbanColumn(timeline('contract_data_pending'))).toBe('docs_deposit')
    expect(timelineKanbanColumn(timeline('contract_issued'))).toBe('contract')
    expect(timelineKanbanColumn(timeline('sold'))).toBe('sold')
    expect(timelineKanbanColumn(timeline('cancelled'))).toBe('cancelled')
  })
})

describe('visibleColumnActions', () => {
  it('drops dialogue and actions that belong to other columns', () => {
    expect(
      visibleColumnActions('pre_reservation', [
        'open_dialogue',
        'submit_proposal',
        'submit_deposit_proof',
        'submit_contract_data',
        'extend_hold',
      ]),
    ).toEqual(['submit_proposal', 'extend_hold'])

    expect(visibleColumnActions('sold', ['validate_contract', 'open_dialogue'])).toEqual([])
  })
})
