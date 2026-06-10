import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { builderApi, type Building, type Unit } from '@/lib/api'

export function BuilderHome() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selected, setSelected] = useState<Building | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setBuildings(await builderApi.listBuildings())
    } catch {
      setError('Faça login como construtora para carregar empreendimentos.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function selectBuilding(building: Building) {
    setSelected(building)
    setUnits(await builderApi.listUnits(building.id))
  }

  async function handleCreateBuilding(e: React.FormEvent) {
    e.preventDefault()
    await builderApi.createBuilding({ name, published: false })
    setName('')
    await load()
  }

  async function handleCreateUnit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    await builderApi.createUnit(selected.id, { code })
    setCode('')
    setUnits(await builderApi.listUnits(selected.id))
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    await builderApi.createInvite(inviteEmail)
    setInviteEmail('')
  }

  return (
    <DashboardShell role="builder" title="Empreendimentos">
      <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Empreendimentos</h3>
        <form onSubmit={handleCreateBuilding} className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Nome do empreendimento"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button type="submit">Criar</Button>
        </form>
        <ul className="divide-y rounded-lg border">
          {buildings.map((building) => (
            <li key={building.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
                onClick={() => void selectBuilding(building)}
              >
                <span className="font-medium">{building.name}</span>
                <span className="text-xs text-muted-foreground">
                  {building.published ? 'Publicado' : 'Rascunho'} · {building.units_count ?? 0} un.
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected && (
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Unidades — {selected.name}</h3>
          <form onSubmit={handleCreateUnit} className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Código (ex: 101)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Button type="submit">Adicionar</Button>
          </form>
          <ul className="space-y-2">
            {units.map((unit) => (
              <li key={unit.id} className="rounded-md border px-4 py-2 text-sm">
                {unit.code} — <span className="text-muted-foreground">{unit.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-lg font-medium">Convidar corretor</h3>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
            placeholder="E-mail do corretor"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <Button type="submit">Enviar convite</Button>
        </form>
      </section>
      </div>
    </DashboardShell>
  )
}
