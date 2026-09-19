import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheckIcon,
  BanIcon,
  KeyRoundIcon,
  MessagesSquareIcon,
  PenLineIcon,
  ScaleIcon,
  WalletIcon,
} from 'lucide-react'
import type {
  BuilderReservationListItem,
  ReservationKanbanColumn,
  ReservationTimeline,
} from '@/lib/api'

export type KanbanColumnTheme = {
  column: string
  iconWrap: string
  title: string
  count: string
  ring: string
}

export const RESERVATION_KANBAN_COLUMNS: {
  id: ReservationKanbanColumn
  label: string
  icon: LucideIcon
  emptyDescription: string
  theme: KanbanColumnTheme
}[] = [
  {
    id: 'pre_reservation',
    label: 'Pré-reserva/Diálogo',
    icon: MessagesSquareIcon,
    emptyDescription: 'As pré-reservas em diálogo aparecerão nesta coluna.',
    theme: {
      column: 'bg-sky-50/60',
      iconWrap: 'bg-sky-100 text-sky-600',
      title: 'text-sky-700',
      count: 'text-sky-600',
      ring: 'ring-sky-300',
    },
  },
  {
    id: 'proposal_review',
    label: 'Proposta em análise',
    icon: ScaleIcon,
    emptyDescription: 'As propostas aguardando análise aparecerão nesta coluna.',
    theme: {
      column: 'bg-amber-50/60',
      iconWrap: 'bg-amber-100 text-amber-600',
      title: 'text-amber-800',
      count: 'text-amber-700',
      ring: 'ring-amber-300',
    },
  },
  {
    id: 'proposal_formalization',
    label: 'Proposta aceita/Formalização',
    icon: BadgeCheckIcon,
    emptyDescription: 'As propostas aceitas e em formalização aparecerão nesta coluna.',
    theme: {
      column: 'bg-emerald-50/60',
      iconWrap: 'bg-emerald-100 text-emerald-600',
      title: 'text-emerald-800',
      count: 'text-emerald-700',
      ring: 'ring-emerald-300',
    },
  },
  {
    id: 'docs_deposit',
    label: 'Documentação & Sinal',
    icon: WalletIcon,
    emptyDescription: 'Reservas em documentação e sinal aparecerão nesta coluna.',
    theme: {
      column: 'bg-violet-50/60',
      iconWrap: 'bg-violet-100 text-violet-600',
      title: 'text-violet-800',
      count: 'text-violet-700',
      ring: 'ring-violet-300',
    },
  },
  {
    id: 'contract',
    label: 'Contrato (assinaturas)',
    icon: PenLineIcon,
    emptyDescription: 'Reservas em assinatura de contrato aparecerão nesta coluna.',
    theme: {
      column: 'bg-teal-50/60',
      iconWrap: 'bg-teal-100 text-teal-700',
      title: 'text-teal-800',
      count: 'text-teal-700',
      ring: 'ring-teal-300',
    },
  },
  {
    id: 'sold',
    label: 'Vendida',
    icon: KeyRoundIcon,
    emptyDescription: 'Reservas vendidas aparecerão nesta coluna.',
    theme: {
      column: 'bg-lime-50/60',
      iconWrap: 'bg-lime-100 text-lime-700',
      title: 'text-lime-800',
      count: 'text-lime-700',
      ring: 'ring-lime-300',
    },
  },
  {
    id: 'cancelled',
    label: 'Cancelada',
    icon: BanIcon,
    emptyDescription: 'Reservas canceladas aparecerão nesta coluna.',
    theme: {
      column: 'bg-rose-50/60',
      iconWrap: 'bg-rose-100 text-rose-600',
      title: 'text-rose-800',
      count: 'text-rose-600',
      ring: 'ring-rose-300',
    },
  },
]

const AVATAR_TONES = [
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
] as const

export const KANBAN_CARD_ACTIONS: Record<string, { hint: string; label: string }> = {
  reply: {
    hint: 'Há uma mensagem aguardando sua resposta.',
    label: 'Responder',
  },
  start_dialogue: {
    hint: 'Inicie o diálogo com a construtora.',
    label: 'Enviar mensagem',
  },
  proposal_decision: {
    hint: 'É necessário responder a proposta do cliente.',
    label: 'Responder',
  },
  deposit_proof_approval: {
    hint: 'É necessário analisar o comprovante de sinal.',
    label: 'Analisar',
  },
  witness_signature: {
    hint: 'É necessário assinar o contrato como testemunha.',
    label: 'Assinar',
  },
  sold_validation: {
    hint: 'É necessário validar a venda desta unidade.',
    label: 'Validar',
  },
  builder_contract_sign: {
    hint: 'É necessário assinar o contrato da construtora.',
    label: 'Assinar',
  },
  return_signed_proposal: {
    hint: 'É necessário devolver a proposta assinada.',
    label: 'Devolver',
  },
  upload_signed_contract: {
    hint: 'É necessário enviar o contrato assinado.',
    label: 'Enviar',
  },
  submit_proposal: {
    hint: 'É necessário reenviar a proposta.',
    label: 'Reenviar',
  },
  submit_deposit_proof: {
    hint: 'É necessário anexar o comprovante de sinal.',
    label: 'Anexar',
  },
  submit_contract_data: {
    hint: 'É necessário enviar os dados do contrato.',
    label: 'Enviar dados',
  },
  mark_signed_gov: {
    hint: 'É necessário registrar a assinatura no órgão.',
    label: 'Registrar',
  },
  decide_proposal: {
    hint: 'É necessário responder a proposta do cliente.',
    label: 'Responder',
  },
  issue_contract: {
    hint: 'Emita o contrato no andamento da reserva para avançar.',
    label: 'Emitir',
  },
  drop_hold: {
    hint: 'Encerre a pré-reserva pelo andamento para concluir esta ação.',
    label: 'Encerrar',
  },
}

export type KanbanCardCta =
  | { hint: string; label: string; interactive: true }
  | { hint: string; interactive: false }

/**
 * Pré-reserva: botão com label da ação (Responder, Enviar mensagem…) quando é a vez do viewer;
 * senão, só o hint de fila. Demais colunas (incl. proposta): fila por waiting_on, nunca “Responder” de mensagem.
 */
export function resolveKanbanCardCta(
  reservation: Pick<
    BuilderReservationListItem,
    'kanban_column' | 'needs_action' | 'pending_action' | 'situation' | 'status'
  >,
  profile: 'builder' | 'broker',
): KanbanCardCta | null {
  if (reservation.kanban_column === 'sold' || reservation.kanban_column === 'cancelled') {
    return null
  }

  const actionMeta = reservation.pending_action
    ? KANBAN_CARD_ACTIONS[reservation.pending_action]
    : null
  const waitingOn = reservation.situation?.current?.waiting_on ?? null
  const ownTurnHint =
    actionMeta?.hint ?? 'Abra o andamento da reserva e conclua a etapa atual para avançar.'

  if (reservation.kanban_column === 'pre_reservation') {
    if (reservation.needs_action && actionMeta) {
      return {
        hint: actionMeta.hint,
        label: actionMeta.label,
        interactive: true,
      }
    }

    if (!waitingOn) {
      return null
    }

    return queueCta(waitingOn, profile, reservation.kanban_column, ownTurnHint)
  }

  if (!waitingOn) {
    return null
  }

  return queueCta(waitingOn, profile, reservation.kanban_column, ownTurnHint)
}

function queueCta(
  waitingOn: 'broker' | 'builder',
  profile: 'builder' | 'broker',
  column: ReservationKanbanColumn,
  ownTurnHint: string,
): KanbanCardCta {
  if (waitingOn === profile) {
    return {
      hint: ownTurnHint,
      label: 'Aguardando você',
      interactive: true,
    }
  }

  return {
    hint: waitingOnOtherHint(waitingOn, column),
    interactive: false,
  }
}

function waitingOnOtherHint(
  waitingOn: 'broker' | 'builder',
  column: ReservationKanbanColumn,
): string {
  if (column === 'proposal_review') {
    return waitingOn === 'builder'
      ? 'A construtora está analisando a proposta.'
      : 'O corretor precisa reenviar a proposta.'
  }

  if (column === 'pre_reservation') {
    return waitingOn === 'builder'
      ? 'A construtora precisa responder no diálogo.'
      : 'O corretor precisa continuar o diálogo ou enviar a proposta.'
  }

  return waitingOn === 'builder'
    ? 'A próxima ação é da construtora.'
    : 'A próxima ação é do corretor.'
}

export function kanbanProcessHint(action: string | null | undefined): string {
  return (
    (action ? KANBAN_CARD_ACTIONS[action]?.hint : null) ??
    'Abra o andamento da reserva e conclua a etapa atual para avançar.'
  )
}

export function resolveKanbanDrop(
  reservation: Pick<BuilderReservationListItem, 'kanban_column' | 'allowed_kanban_moves'>,
  column: ReservationKanbanColumn | null,
): 'ignore' | 'move' | 'process_required' {
  if (column === null || column === reservation.kanban_column) {
    return 'ignore'
  }

  if (column === 'cancelled') {
    return 'move'
  }

  if (column === 'sold' && (reservation.allowed_kanban_moves ?? []).includes('sold')) {
    return 'move'
  }

  return 'process_required'
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function avatarToneClass(seed: number): string {
  return AVATAR_TONES[Math.abs(seed) % AVATAR_TONES.length]
}

const COLUMN_ACTION_ALLOWLIST: Record<ReservationKanbanColumn, readonly string[]> = {
  pre_reservation: ['submit_proposal', 'extend_hold', 'drop_hold'],
  proposal_review: ['submit_proposal'],
  proposal_formalization: ['return_signed_proposal'],
  docs_deposit: [
    'submit_deposit_proof',
    'return_signed_proposal',
    'submit_contract_data',
    'approve_deposit_proof',
  ],
  contract: [
    'issue_contract',
    'mark_signed_gov',
    'upload_signed_contract',
    'upload_builder_signed_contract',
    'sign_as_witness',
    'validate_contract',
  ],
  sold: [],
  cancelled: [],
}

export function kanbanColumnLabel(column: ReservationKanbanColumn): string {
  return RESERVATION_KANBAN_COLUMNS.find((item) => item.id === column)?.label ?? column
}

export function timelineKanbanColumn(
  timeline: Pick<ReservationTimeline, 'current_stage' | 'attachments'>,
): ReservationKanbanColumn {
  const stage = timeline.current_stage

  if (stage === 'cancelled') {
    return 'cancelled'
  }

  if (stage === 'sold') {
    return 'sold'
  }

  if (
    stage === 'contract_issued' ||
    stage === 'contract_uploaded' ||
    stage === 'contract_builder_signed'
  ) {
    return 'contract'
  }

  if (stage === 'proposal_pending' || stage === 'proposal_returned') {
    return 'proposal_review'
  }

  if (stage === 'pre_hold') {
    return 'pre_reservation'
  }

  const hasBuilderSigned = timeline.attachments.some((item) => item.kind === 'proposal_signed_builder')
  const hasBothSigned = timeline.attachments.some((item) => item.kind === 'proposal_signed_both')

  if (stage === 'deposit_pending' && hasBuilderSigned && !hasBothSigned) {
    return 'proposal_formalization'
  }

  return 'docs_deposit'
}

export function visibleColumnActions(
  column: ReservationKanbanColumn,
  actions: string[],
): string[] {
  const allowed = new Set(COLUMN_ACTION_ALLOWLIST[column])

  return actions.filter((action) => action !== 'open_dialogue' && allowed.has(action))
}
