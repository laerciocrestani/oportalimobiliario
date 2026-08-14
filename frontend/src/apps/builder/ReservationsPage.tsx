import { useEffect, useState } from 'react'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { ReservationMessagesDialog } from '@/apps/builder/components/ReservationMessagesDialog'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { ReservationChatButton } from '@/components/reservations/ReservationChatButton'
import { ReservationActionsMenu } from '@/components/reservations/ReservationActionsMenu'
import { ReservationCancelDialog } from '@/components/reservations/ReservationCancelDialog'
import { ReservationWaitingStatus } from '@/components/reservations/ReservationWaitingStatus'
import { ReservationSituation } from '@/components/reservations/ReservationSituation'
import { ReservationTimelineSheet } from '@/components/reservations/ReservationTimelineSheet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { builderApi, type BuilderReservationListItem } from '@/lib/api'
import { notifyReservationBadgeRefresh } from '@/lib/reservation-badge-events'

export function ReservationsPage() {
  const { permissions } = useBuilderPermissions()
  const [reservations, setReservations] = useState<BuilderReservationListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [cancelTarget, setCancelTarget] = useState<BuilderReservationListItem | null>(null)
  const [messagesReservationId, setMessagesReservationId] = useState<number | null>(null)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [timelineReservationId, setTimelineReservationId] = useState<number | null>(null)
  const [timelineOpen, setTimelineOpen] = useState(false)

  const canManage = permissions.includes('reservations.cancel')

  async function load() {
    if (!canManage) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      setReservations(await builderApi.listReservations())
    } catch {
      setError('Não foi possível carregar as reservas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [canManage])

  async function handleCancel(reason: string) {
    const reservation = cancelTarget
    if (reservation === null) {
      return
    }

    try {
      setError(null)
      setCancellingId(reservation.id)
      await builderApi.cancelReservation(reservation.id, reason)
      setReservations((current) => current.filter((item) => item.id !== reservation.id))
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

  function handleMessageSent() {
    void load()
  }

  if (!canManage) {
    return (
      <BuilderDashboardShell title="Reservas">
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para visualizar reservas.
        </p>
      </BuilderDashboardShell>
    )
  }

  return (
    <BuilderDashboardShell title="Reservas">
      <div className="space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Reservas ativas</CardTitle>
            <CardDescription>
              Reservas feitas por corretores nas unidades dos seus empreendimentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando reservas...</p>
            ) : reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reserva no momento.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Empreendimento</th>
                      <th className="px-4 py-3 font-medium">Situação</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Corretor</th>
                      <th className="px-4 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((reservation) => (
                      <tr key={reservation.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{reservation.client?.name ?? '—'}</span>
                            {reservation.needs_proposal_decision ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                                Proposta pendente
                              </span>
                            ) : null}
                            {reservation.needs_deposit_proof_approval ? (
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
                                Comprovante pendente
                              </span>
                            ) : null}
                            {reservation.deposit_overdue ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900">
                                Sinal vencido
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {reservation.unit?.building?.name ?? '—'}
                          {reservation.unit?.code ? ` · ${reservation.unit.code}` : ''}
                        </td>
                        <td className="px-2 py-2">
                          <ReservationSituation
                            situation={reservation.situation}
                            onOpenTimeline={() => handleOpenTimeline(reservation.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <ReservationWaitingStatus
                            profile="builder"
                            waitingOn={reservation.situation.current.waiting_on}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="min-w-0 truncate">{reservation.broker?.name ?? '—'}</span>
                            <ReservationChatButton
                              label={reservation.broker?.name ?? reservation.client?.name ?? `reserva ${reservation.id}`}
                              needsReply={reservation.needs_reply}
                              onClick={() => handleOpenMessages(reservation.id)}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ReservationActionsMenu
                            reservation={reservation}
                            cancelling={cancellingId === reservation.id}
                            onTimeline={() => handleOpenTimeline(reservation.id)}
                            onMessages={() => handleOpenMessages(reservation.id)}
                            onCancel={() => setCancelTarget(reservation)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      <ReservationTimelineSheet
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
      />
    </BuilderDashboardShell>
  )
}
