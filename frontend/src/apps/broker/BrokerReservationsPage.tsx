import { useEffect, useState } from 'react'
import { BrokerDashboardShell } from '@/apps/broker/components/BrokerDashboardShell'
import { ReservationMessagesDialog } from '@/apps/builder/components/ReservationMessagesDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { brokerApi, type BuilderReservationListItem } from '@/lib/api'
import { notifyReservationBadgeRefresh } from '@/lib/reservation-badge-events'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function BrokerReservationsPage() {
  const [reservations, setReservations] = useState<BuilderReservationListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [messagesReservationId, setMessagesReservationId] = useState<number | null>(null)
  const [messagesOpen, setMessagesOpen] = useState(false)

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

  async function handleCancel(reservationId: number) {
    if (!window.confirm('Deseja cancelar esta reserva? A unidade voltará a ficar disponível.')) {
      return
    }

    try {
      setError(null)
      setCancellingId(reservationId)
      await brokerApi.cancelReservation(reservationId)
      setReservations((current) => current.filter((item) => item.id !== reservationId))
      notifyReservationBadgeRefresh()
    } catch {
      setError('Não foi possível cancelar a reserva.')
    } finally {
      setCancellingId(null)
    }
  }

  function handleOpenMessages(reservationId: number) {
    setMessagesReservationId(reservationId)
    setMessagesOpen(true)
  }

  function handleMessageSent() {
    void load()
  }

  return (
    <BrokerDashboardShell title="Reservas">
      <div className="space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Minhas reservas</CardTitle>
            <CardDescription>
              Reservas dos seus clientes nos empreendimentos com acesso liberado.
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
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((reservation) => (
                      <tr key={reservation.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">{reservation.client?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          {reservation.unit?.building?.name ?? '—'}
                          {reservation.unit?.code ? ` · ${reservation.unit.code}` : ''}
                        </td>
                        <td className="px-4 py-3">{formatDate(reservation.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={reservation.needs_reply ? 'default' : 'outline'}
                              onClick={() => handleOpenMessages(reservation.id)}
                            >
                              Responder
                              {reservation.needs_reply ? ' · nova' : ''}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={cancellingId === reservation.id}
                              onClick={() => void handleCancel(reservation.id)}
                            >
                              {cancellingId === reservation.id ? 'Cancelando...' : 'Cancelar'}
                            </Button>
                          </div>
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

      <ReservationMessagesDialog
        profile="broker"
        reservationId={messagesReservationId}
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
        onMessageSent={handleMessageSent}
      />
    </BrokerDashboardShell>
  )
}
