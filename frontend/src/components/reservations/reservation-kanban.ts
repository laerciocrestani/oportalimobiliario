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
import type { ReservationKanbanColumn } from '@/lib/api'

export const RESERVATION_KANBAN_COLUMNS: {
  id: ReservationKanbanColumn
  label: string
  icon: LucideIcon
}[] = [
  { id: 'pre_reservation', label: 'Pré-reserva/Diálogo', icon: MessagesSquareIcon },
  { id: 'proposal_review', label: 'Proposta em análise', icon: ScaleIcon },
  { id: 'proposal_formalization', label: 'Proposta aceita/Formalização', icon: BadgeCheckIcon },
  { id: 'docs_deposit', label: 'Documentação & Sinal', icon: WalletIcon },
  { id: 'contract', label: 'Contrato (assinaturas)', icon: PenLineIcon },
  { id: 'sold', label: 'Vendida', icon: KeyRoundIcon },
  { id: 'cancelled', label: 'Cancelada', icon: BanIcon },
]
