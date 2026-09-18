import { Badge } from '@/components/ui/badge'
import type { ReservationWaitingOn } from '@/lib/api'

export const WAITING_LABEL: Record<ReservationWaitingOn, string> = {
  broker: 'Aguardando corretor',
  builder: 'Aguardando construtora',
}

export function ReservationWaitingStatus({
  waitingOn,
  profile,
  reservationStatus,
  needsAction,
}: {
  waitingOn: ReservationWaitingOn | null
  profile: 'builder' | 'broker'
  reservationStatus?: string
  needsAction?: boolean
}) {
  if (reservationStatus === 'cancelled') {
    return <Badge variant="destructive">Cancelada</Badge>
  }
  if (!waitingOn && !needsAction) {
    return <span className="text-muted-foreground">—</span>
  }

  const waitingOnYou = needsAction ?? waitingOn === profile

  return (
    <Badge variant={waitingOnYou ? 'warning' : 'secondary'}>
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {waitingOnYou ? 'Aguardando você' : waitingOn ? WAITING_LABEL[waitingOn] : 'Ação pendente'}
    </Badge>
  )
}
