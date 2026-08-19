import { useEffect, useState } from 'react'
import { ArrowLeftIcon } from 'lucide-react'
import { BuildingCard } from '@/apps/public/components/BuildingCard'
import { PublicHero } from '@/apps/public/components/PublicHero'
import { PublicLayout } from '@/apps/public/components/PublicLayout'
import { PublicUnitList } from '@/apps/public/components/PublicUnitList'
import { Button } from '@/components/ui/button'
import { publicApi, type Building, type PublicBuildingListItem, type Unit } from '@/lib/api'

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
  const [buildings, setBuildings] = useState<PublicBuildingListItem[]>([])
  const [selected, setSelected] = useState<(Building & { units?: Unit[] }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void publicApi
      .listBuildings()
      .then(setBuildings)
      .finally(() => setLoading(false))
    document.title = 'Lançamentos | Dia de Imóveis'
  }, [])

  async function openDetail(slug: string) {
    const detail = await publicApi.getBuilding(slug)
    setSelected(detail)
    applySeo(detail)
    document.documentElement.scrollTop = 0
  }

  function closeDetail() {
    setSelected(null)
    document.title = 'Lançamentos | Dia de Imóveis'
  }

  return (
    <PublicLayout hero={selected ? undefined : <PublicHero />}>
      {selected ? (
        <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" onClick={closeDetail}>
            <ArrowLeftIcon className="size-4" aria-hidden />
            Voltar aos lançamentos
          </Button>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{selected.name}</h1>
            {selected.city ? (
              <p className="text-muted-foreground">
                {selected.city}/{selected.state}
              </p>
            ) : null}
          </div>

          {selected.description ? (
            <p className="text-base leading-relaxed text-foreground/90">{selected.description}</p>
          ) : null}

          {selected.units && selected.units.length > 0 ? (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">Unidades disponíveis</h2>
              <PublicUnitList units={selected.units} />
            </div>
          ) : null}
        </article>
      ) : (
        <section id="lancamentos" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Lançamentos</h2>
            <p className="mt-2 text-muted-foreground">
              Empreendimentos publicados com valores a partir da unidade mais acessível.
            </p>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[4/3] animate-pulse rounded-xl bg-muted"
                  aria-hidden
                />
              ))}
            </div>
          ) : buildings.length > 0 ? (
            <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {buildings.map((building) => (
                <li key={building.id}>
                  <BuildingCard building={building} onSelect={(slug) => void openDetail(slug)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              Nenhum lançamento publicado no momento. Volte em breve.
            </p>
          )}
        </section>
      )}
    </PublicLayout>
  )
}
