import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BrokerDashboardShell } from '@/apps/broker/components/BrokerDashboardShell'
import { ReservationMessagesDialog } from '@/apps/builder/components/ReservationMessagesDialog'
import { ReservationCancelDialog } from '@/components/reservations/ReservationCancelDialog'
import { ReservationKanbanBoard } from '@/components/reservations/ReservationKanbanBoard'
import { ReservationProgressDialog } from '@/components/reservations/ReservationProgressDialog'
import { kanbanProcessHint } from '@/components/reservations/reservation-kanban'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ApiRequestError,
  brokerApi,
  type BuilderReservationListItem,
  type ReservationKanbanColumn,
} from '@/lib/api'
import { notifyReservationBadgeRefresh } from '@/lib/reservation-badge-events'

export function BrokerReservationsPage() {
  const [reservations, setReservations] = useState<BuilderReservationListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [cancelTarget, setCancelTarget] = useState<BuilderReservationListItem | null>(null)
  const [messagesReservationId, setMessagesReservationId] = useState<number | null>(null)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [timelineReservationId, setTimelineReservationId] = useState<number | null>(null)
  const [timelineOpen, setTimelineOpen] = useState(false)

  async function load() {
    try {
      setError(null)
      setReservations(await brokerApi.listReservations())
    } catch {
      setError('Não foi possível carregar as reservas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCancel(reason: string) {
    const reservation = cancelTarget
    if (reservation === null) {
      return
    }

    try {
      setError(null)
      setCancellingId(reservation.id)
      await brokerApi.moveReservationKanban(reservation.id, 'cancelled', reason)
      await load()
      notifyReservationBadgeRefresh()
    } catch {
      throw new Error('cancel_failed')
    } finally {
      setCancellingId(null)
    }
  }

  function handleOpenTimeline(reservationId: number) {
    setTimelineReservationId(reservationId)
    setTimelineOpen(true)
  }

  function handleProcessRequired(reservation: BuilderReservationListItem, action?: string) {
    toast.warning('Não é possível avançar ainda', {
      description: kanbanProcessHint(action ?? reservation.pending_action),
    })
    handleOpenTimeline(reservation.id)
  }

  function handleOpenMessages(reservationId: number) {
    setMessagesReservationId(reservationId)
    setMessagesOpen(true)
  }

  async function handleMove(reservation: BuilderReservationListItem, column: ReservationKanbanColumn) {
    if (column === 'cancelled') {
      setCancelTarget(reservation)
      return
    }

    try {
      setError(null)
      await brokerApi.moveReservationKanban(reservation.id, column)
      await load()
      notifyReservationBadgeRefresh()
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.code === 'action_required') {
        handleProcessRequired(reservation, caught.action)
        return
      }

      toast.error(caught instanceof Error ? caught.message : 'Não foi possível mover a reserva.')
    }
  }

  function handleMessageSent() {
    void load()
  }

  return (
    <BrokerDashboardShell title="Reservas" fill>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {error ? <p className="shrink-0 text-sm text-destructive">{error}</p> : null}

        <Card className="min-h-0 flex-1">
          <CardHeader className="shrink-0">
            <CardTitle>Minhas reservas</CardTitle>
            <CardDescription>
              Arraste o card para a coluna correspondente. Você vê apenas as suas reservas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando reservas...</p>
            ) : (
              <ReservationKanbanBoard
                profile="broker"
                reservations={reservations}
                cancellingId={cancellingId}
                canCancel
                canMessage
                onOpen={handleOpenTimeline}
                onMessages={handleOpenMessages}
                onCancel={setCancelTarget}
                onMove={handleMove}
                onProcessRequired={handleProcessRequired}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ReservationCancelDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null)
          }
        }}
        clientName={cancelTarget?.client?.name}
        onConfirm={handleCancel}
      />

      <ReservationProgressDialog
        profile="broker"
        reservationId={timelineReservationId}
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        onTimelineRefresh={() => void load()}
      />

      <ReservationMessagesDialog
        profile="broker"
        reservationId={messagesReservationId}
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
        onMessageSent={handleMessageSent}
        readOnly={reservations.find((item) => item.id === messagesReservationId)?.status === 'cancelled'}
      />
    </BrokerDashboardShell>
  )
}
