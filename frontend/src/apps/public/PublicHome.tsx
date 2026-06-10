import { useEffect, useState } from 'react'
import { publicApi, type Building } from '@/lib/api'

function applySeo(building: Building) {
  document.title = building.seo_title ?? `${building.name} | Dia de Imóveis`
  const description = building.seo_description ?? building.description ?? ''
  let meta = document.querySelector('meta[name="description"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'description')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', description)
}

export function PublicHome() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selected, setSelected] = useState<(Building & { units?: { code: string }[] }) | null>(null)

  useEffect(() => {
    void publicApi.listBuildings().then(setBuildings)
    document.title = 'Lançamentos | Dia de Imóveis'
  }, [])

  async function openDetail(id: number) {
    const detail = await publicApi.getBuilding(id)
    setSelected(detail)
    applySeo(detail)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Portal público</h2>
        <p className="mt-2 text-muted-foreground">Lançamentos publicados — sem login.</p>
      </div>

      {selected ? (
        <article className="space-y-4 rounded-lg border p-6">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={() => setSelected(null)}
          >
            ← Voltar
          </button>
          <h3 className="text-xl font-semibold">{selected.name}</h3>
          {selected.city && (
            <p className="text-sm text-muted-foreground">
              {selected.city}/{selected.state}
            </p>
          )}
          <p className="text-sm">{selected.description}</p>
          {selected.units && selected.units.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium">Unidades disponíveis</h4>
              <ul className="flex flex-wrap gap-2">
                {selected.units.map((unit) => (
                  <li key={unit.code} className="rounded-md bg-muted px-2 py-1 text-xs">
                    {unit.code}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {buildings.map((building) => (
            <li key={building.id}>
              <button
                type="button"
                className="h-full w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => void openDetail(building.id)}
              >
                <h3 className="font-semibold">{building.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[building.city, building.state].filter(Boolean).join(' / ') || 'Localização sob consulta'}
                </p>
                <p className="mt-2 line-clamp-2 text-sm">{building.description}</p>
              </button>
            </li>
          ))}
          {buildings.length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhum lançamento publicado.</li>
          )}
        </ul>
      )}
    </div>
  )
}
