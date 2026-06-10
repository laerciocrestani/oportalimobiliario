import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { brokerApi, type Unit } from '@/lib/api'

export function BrokerHome() {
  const [units, setUnits] = useState<Unit[]>([])
  const [token, setToken] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setUnits(await brokerApi.listUnits())
      setError(null)
    } catch {
      setError('Faça login como corretor para ver unidades liberadas.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleReservation(unitId: number) {
    await brokerApi.createReservation(unitId)
    setMessage('Reserva criada com sucesso.')
    await load()
  }

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault()
    await brokerApi.acceptInvite(token)
    setMessage('Convite aceito.')
    setToken('')
  }

  return (
    <DashboardShell role="broker" title="Minhas unidades">
      <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Aceitar convite</h3>
        <form onSubmit={handleAcceptInvite} className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Token do convite"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <Button type="submit">Aceitar</Button>
        </form>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Minhas unidades</h3>
        <ul className="divide-y rounded-lg border">
          {units.map((unit) => (
            <li key={unit.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{unit.code}</p>
                <p className="text-xs text-muted-foreground">
                  {unit.building?.name ?? 'Empreendimento'} · {unit.status}
                </p>
              </div>
              {unit.status === 'available' && (
                <Button size="sm" onClick={() => void handleReservation(unit.id)}>
                  Reservar
                </Button>
              )}
            </li>
          ))}
          {units.length === 0 && !error && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhuma unidade liberada ainda.
            </li>
          )}
        </ul>
      </section>
      </div>
    </DashboardShell>
  )
}
