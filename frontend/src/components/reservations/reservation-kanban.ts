import type { ReservationKanbanColumn } from '@/lib/api'

export const RESERVATION_KANBAN_COLUMNS: {
  id: ReservationKanbanColumn
  label: string
}[] = [
  { id: 'pre_reservation', label: 'Pré-reserva/Diálogo' },
  { id: 'proposal_review', label: 'Proposta em análise' },
  { id: 'proposal_formalization', label: 'Proposta aceita/Formalização' },
  { id: 'docs_deposit', label: 'Documentação & Sinal' },
  { id: 'contract', label: 'Contrato (assinaturas)' },
  { id: 'sold', label: 'Vendida' },
  { id: 'cancelled', label: 'Cancelada' },
]
