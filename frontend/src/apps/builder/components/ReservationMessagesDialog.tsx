import { ReservationChatPanel } from '@/components/reservations/ReservationChatPanel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ReservationMessagesDialogProps = {
  profile: 'builder' | 'broker'
  reservationId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMessageSent?: () => void
  readOnly?: boolean
}

export function ReservationMessagesDialog({
  profile,
  reservationId,
  open,
  onOpenChange,
  onMessageSent,
  readOnly = false,
}: ReservationMessagesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-transparent pointer-events-none supports-backdrop-filter:backdrop-blur-none"
        className="top-auto right-4 bottom-4 left-auto flex h-[min(36rem,calc(100vh-2rem))] w-[min(26rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b px-4 py-3 pr-12 text-left">
          <DialogTitle>Conversa da reserva</DialogTitle>
          <DialogDescription className="sr-only">
            Troca de mensagens entre construtora e corretor sobre esta reserva.
          </DialogDescription>
        </DialogHeader>

        <ReservationChatPanel
          profile={profile}
          reservationId={reservationId}
          active={open}
          onMessageSent={onMessageSent}
          readOnly={readOnly}
          composerId="reservation-message"
        />
      </DialogContent>
    </Dialog>
  )
}
