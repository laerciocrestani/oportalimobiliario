import { Badge } from '@/components/ui/badge'
import type { ReservationWaitingOn } from '@/lib/api'

export const WAITING_LABEL: Record<ReservationWaitingOn, string> = {
  broker: 'Aguardando corretor',
  builder: 'Aguardando construtora',
}

export function ReservationWaitingStatus({
  waitingOn,
  profile,
}: {
  waitingOn: ReservationWaitingOn | null
  profile: 'builder' | 'broker'
}) {
  if (!waitingOn) {
    return <span className="text-muted-foreground">—</span>
  }

  const waitingOnYou = waitingOn === profile

  return (
    <Badge variant={waitingOnYou ? 'warning' : 'secondary'}>
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {waitingOnYou ? 'Aguardando você' : WAITING_LABEL[waitingOn]}
    </Badge>
  )
}
