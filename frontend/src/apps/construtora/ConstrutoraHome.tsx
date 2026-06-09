import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { construtoraApi, type Empreendimento, type Unidade } from '@/lib/api'

export function ConstrutoraHome() {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([])
  const [selected, setSelected] = useState<Empreendimento | null>(null)
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [conviteEmail, setConviteEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setEmpreendimentos(await construtoraApi.listEmpreendimentos())
    } catch {
      setError('Faça login como construtora para carregar empreendimentos.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function selectEmpreendimento(emp: Empreendimento) {
    setSelected(emp)
    setUnidades(await construtoraApi.listUnidades(emp.id))
  }

  async function handleCreateEmpreendimento(e: React.FormEvent) {
    e.preventDefault()
    await construtoraApi.createEmpreendimento({ nome, publicado: false })
    setNome('')
    await load()
  }

  async function handleCreateUnidade(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    await construtoraApi.createUnidade(selected.id, { codigo })
    setCodigo('')
    setUnidades(await construtoraApi.listUnidades(selected.id))
  }

  async function handleConvite(e: React.FormEvent) {
    e.preventDefault()
    await construtoraApi.createConvite(conviteEmail)
    setConviteEmail('')
  }

  return (
    <DashboardShell role="construtora" title="Empreendimentos">
      <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Empreendimentos</h3>
        <form onSubmit={handleCreateEmpreendimento} className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Nome do empreendimento"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <Button type="submit">Criar</Button>
        </form>
        <ul className="divide-y rounded-lg border">
          {empreendimentos.map((emp) => (
            <li key={emp.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
                onClick={() => void selectEmpreendimento(emp)}
              >
                <span className="font-medium">{emp.nome}</span>
                <span className="text-xs text-muted-foreground">
                  {emp.publicado ? 'Publicado' : 'Rascunho'} · {emp.unidades_count ?? 0} un.
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected && (
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Unidades — {selected.nome}</h3>
          <form onSubmit={handleCreateUnidade} className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Código (ex: 101)"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
            <Button type="submit">Adicionar</Button>
          </form>
          <ul className="space-y-2">
            {unidades.map((u) => (
              <li key={u.id} className="rounded-md border px-4 py-2 text-sm">
                {u.codigo} — <span className="text-muted-foreground">{u.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Convidar corretor</h3>
        <form onSubmit={handleConvite} className="flex gap-2">
          <input
            type="email"
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
            placeholder="E-mail do corretor"
            value={conviteEmail}
            onChange={(e) => setConviteEmail(e.target.value)}
            required
          />
          <Button type="submit">Enviar convite</Button>
        </form>
      </section>
      </div>
    </DashboardShell>
  )
}
