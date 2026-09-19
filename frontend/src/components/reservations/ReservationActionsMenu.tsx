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
import { EllipsisVerticalIcon, ListOrderedIcon, XIcon } from 'lucide-react'

type ReservationActionsMenuProps = {
  reservation: BuilderReservationListItem
  cancelling: boolean
  canCancel?: boolean
  onTimeline: () => void
  onCancel: () => void
}

function timelineLabel(reservation: BuilderReservationListItem): string {
  if (reservation.pending_action === 'witness_signature' || reservation.needs_witness_signature) {
    return 'Andamento · testemunha'
  }

  if (reservation.pending_action === 'sold_validation' || reservation.needs_sold_validation) {
    return 'Andamento · venda'
  }

  if (reservation.needs_proposal_decision) {
    return 'Andamento · decisão'
  }

  if (reservation.needs_deposit_proof_approval) {
    return 'Andamento · comprovante'
  }

  if (reservation.status === 'cancelled') {
    return 'Andamento · conversa'
  }

  return 'Andamento'
}

export function ReservationActionsMenu({
  reservation,
  cancelling,
  canCancel = true,
  onTimeline,
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
        </DropdownMenuGroup>
        {reservation.status === 'cancelled' || !canCancel ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" disabled={cancelling} onClick={onCancel}>
                <XIcon />
                {cancelling ? 'Cancelando...' : 'Cancelar'}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
