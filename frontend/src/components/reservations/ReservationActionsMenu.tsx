import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BuilderReservationListItem } from '@/lib/api'
import { EllipsisVerticalIcon, ListOrderedIcon, MessageSquareIcon, XIcon } from 'lucide-react'

type ReservationActionsMenuProps = {
  reservation: BuilderReservationListItem
  cancelling: boolean
  onTimeline: () => void
  onMessages: () => void
  onCancel: () => void
}

function timelineLabel(reservation: BuilderReservationListItem): string {
  if (reservation.needs_proposal_decision) {
    return 'Andamento · decisão'
  }

  if (reservation.needs_deposit_proof_approval) {
    return 'Andamento · comprovante'
  }

  return 'Andamento'
}

function messagesLabel(reservation: BuilderReservationListItem): string {
  return reservation.needs_reply ? 'Responder · nova' : 'Responder'
}

export function ReservationActionsMenu({
  reservation,
  cancelling,
  onTimeline,
  onMessages,
  onCancel,
}: ReservationActionsMenuProps) {
  const clientName = reservation.client?.name ?? `reserva ${reservation.id}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground data-open:bg-muted"
            aria-label={`Ações — ${clientName}`}
          />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onTimeline}>
            <ListOrderedIcon />
            {timelineLabel(reservation)}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMessages}>
            <MessageSquareIcon />
            {messagesLabel(reservation)}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" disabled={cancelling} onClick={onCancel}>
            <XIcon />
            {cancelling ? 'Cancelando...' : 'Cancelar'}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
