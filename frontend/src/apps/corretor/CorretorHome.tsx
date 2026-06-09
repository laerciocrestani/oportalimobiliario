import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { corretorApi, type Unidade } from '@/lib/api'

export function CorretorHome() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [token, setToken] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setUnidades(await corretorApi.listUnidades())
      setError(null)
    } catch {
      setError('Faça login como corretor para ver unidades liberadas.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleReserva(unidadeId: number) {
    await corretorApi.createReserva(unidadeId)
    setMessage('Reserva criada com sucesso.')
    await load()
  }

  async function handleAcceptConvite(e: React.FormEvent) {
    e.preventDefault()
    await corretorApi.acceptConvite(token)
    setMessage('Convite aceito.')
    setToken('')
  }

  return (
    <DashboardShell role="corretor" title="Minhas unidades">
      <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Aceitar convite</h3>
        <form onSubmit={handleAcceptConvite} className="flex gap-2">
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
          {unidades.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{u.codigo}</p>
                <p className="text-xs text-muted-foreground">
                  {u.empreendimento?.nome ?? 'Empreendimento'} · {u.status}
                </p>
              </div>
              {u.status === 'disponivel' && (
                <Button size="sm" onClick={() => void handleReserva(u.id)}>
                  Reservar
                </Button>
              )}
            </li>
          ))}
          {unidades.length === 0 && !error && (
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
