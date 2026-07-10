import { useEffect, useState } from 'react'
import { ReservationMessagesDialog } from '@/apps/builder/components/ReservationMessagesDialog'
import { ReservationTimeline } from '@/components/reservations/ReservationTimeline'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { builderApi, brokerApi, type ReservationTimeline as ReservationTimelineData } from '@/lib/api'

type ReservationTimelineSheetProps = {
  profile: 'broker' | 'builder'
  reservationId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTimelineRefresh?: () => void
}

export function ReservationTimelineSheet({
  profile,
  reservationId,
  open,
  onOpenChange,
  onTimelineRefresh,
}: ReservationTimelineSheetProps) {
  const [timeline, setTimeline] = useState<ReservationTimelineData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [messagesOpen, setMessagesOpen] = useState(false)

  useEffect(() => {
    if (!open || reservationId === null) {
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const api = profile === 'builder' ? builderApi : brokerApi
        const data = await api.getReservationTimeline(reservationId)
        if (!cancelled) {
          setTimeline(data)
        }
      } catch {
        if (!cancelled) {
          setError('Não foi possível carregar o andamento da reserva.')
          setTimeline(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, profile, reservationId])

  function handleAction(action: string) {
    if (action === 'open_dialogue') {
      setMessagesOpen(true)
    }
  }

  function handleMessageSent() {
    onTimelineRefresh?.()

    if (reservationId === null) {
      return
    }

    const api = profile === 'builder' ? builderApi : brokerApi
    void api.getReservationTimeline(reservationId).then(setTimeline).catch(() => {
      setError('Não foi possível atualizar o andamento da reserva.')
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Andamento da reserva</SheetTitle>
            <SheetDescription>
              Acompanhe cada etapa do processo, da pré-reserva até a venda.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando andamento...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : timeline ? (
              <ReservationTimeline timeline={timeline} onAction={handleAction} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <ReservationMessagesDialog
        profile={profile}
        reservationId={reservationId}
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
        onMessageSent={handleMessageSent}
      />
    </>
  )
}
