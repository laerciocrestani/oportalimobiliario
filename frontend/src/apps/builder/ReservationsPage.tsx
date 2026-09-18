import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { ReservationMessagesDialog } from '@/apps/builder/components/ReservationMessagesDialog'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { ReservationCancelDialog } from '@/components/reservations/ReservationCancelDialog'
import { ReservationKanbanBoard } from '@/components/reservations/ReservationKanbanBoard'
import { ReservationProgressDialog } from '@/components/reservations/ReservationProgressDialog'
import {
  ApiRequestError,
  builderApi,
  type BuilderReservationListItem,
  type ReservationKanbanColumn,
} from '@/lib/api'
import { notifyReservationBadgeRefresh } from '@/lib/reservation-badge-events'

export function ReservationsPage() {
  const { permissions, loading: permissionsLoading } = useBuilderPermissions()
  const [reservations, setReservations] = useState<BuilderReservationListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [cancelTarget, setCancelTarget] = useState<BuilderReservationListItem | null>(null)
  const [messagesReservationId, setMessagesReservationId] = useState<number | null>(null)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [timelineReservationId, setTimelineReservationId] = useState<number | null>(null)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const loadRequestId = useRef(0)

  const canManage = permissions.includes('reservations.cancel')
  const [witnessAccess, setWitnessAccess] = useState(false)
  const canAccess = canManage || witnessAccess

  async function load() {
    const requestId = ++loadRequestId.current

    try {
      setError(null)

      if (canManage) {
        setWitnessAccess(false)
        const items = await builderApi.listReservations()

        if (requestId !== loadRequestId.current) {
          return
        }

        setReservations(items)
        return
      }

      const payload = await builderApi.pendingActionsCount()

      if (requestId !== loadRequestId.current) {
        return
      }

      setWitnessAccess(payload.witness_scope)

      if (!payload.witness_scope) {
        setReservations([])
        return
      }

      const items = await builderApi.listReservations()

      if (requestId !== loadRequestId.current) {
        return
      }

      setReservations(items)
    } catch {
      if (requestId !== loadRequestId.current) {
        return
      }

      setError('Não foi possível carregar as reservas.')
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (permissionsLoading) {
      return
    }

    setLoading(true)
    void load()
  }, [canManage, permissionsLoading])

  async function handleCancel(reason: string) {
    const reservation = cancelTarget
    if (reservation === null) {
      return
    }

    try {
      setError(null)
      setCancellingId(reservation.id)
      await builderApi.moveReservationKanban(reservation.id, 'cancelled', reason)
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
      await builderApi.moveReservationKanban(reservation.id, column)
      await load()
      notifyReservationBadgeRefresh()
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.code === 'action_required') {
        handleOpenTimeline(reservation.id)
        return
      }

      toast.error(caught instanceof Error ? caught.message : 'Não foi possível mover a reserva.')
    }
  }

  function handleMessageSent() {
    void load()
  }

  if (permissionsLoading || (loading && !canAccess)) {
    return (
      <BuilderDashboardShell title="Reservas">
        <p className="text-sm text-muted-foreground">Carregando reservas...</p>
      </BuilderDashboardShell>
    )
  }

  if (!canAccess) {
    return (
      <BuilderDashboardShell title="Reservas">
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para visualizar reservas.
        </p>
      </BuilderDashboardShell>
    )
  }

  return (
    <BuilderDashboardShell title="Reservas" fill>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {error ? <p className="shrink-0 text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando reservas...</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ReservationKanbanBoard
              profile="builder"
              reservations={reservations}
              cancellingId={cancellingId}
              canCancel={canManage}
              canMessage={canManage}
              onOpen={handleOpenTimeline}
              onMessages={handleOpenMessages}
              onCancel={setCancelTarget}
              onMove={handleMove}
            />
          </div>
        )}
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
        profile="builder"
        reservationId={timelineReservationId}
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        onTimelineRefresh={() => void load()}
      />

      <ReservationMessagesDialog
        profile="builder"
        reservationId={messagesReservationId}
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
        onMessageSent={handleMessageSent}
        readOnly={reservations.find((item) => item.id === messagesReservationId)?.status === 'cancelled'}
      />
    </BuilderDashboardShell>
  )
}
