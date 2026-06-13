import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { unitStatusLegend } from '@/apps/builder/lib/unit-status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BuildingCoverImage } from '@/components/buildings/BuildingCoverImage'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { builderApi, type Building } from '@/lib/api'

function BuildingCard({ building }: { building: Building }) {
  const summary = building.units_summary
  const location = [building.city, building.state].filter(Boolean).join(' / ')

  return (
    <Link to={`/buildings/${building.id}`} className="block transition-opacity hover:opacity-90">
      <Card className="h-full overflow-hidden">
        <div className="relative">
          <BuildingCoverImage
            buildingId={building.id}
            coverImage={building.cover_image}
            alt={building.name}
            fetchBlob={builderApi.fetchBuildingMediaBlob}
          />
          <Badge
            className="absolute right-3 top-3"
            variant={building.published ? 'default' : 'secondary'}
          >
            {building.published ? 'Publicado' : 'Rascunho'}
          </Badge>
        </div>
        <CardHeader>
          <CardTitle className="text-base">{building.name}</CardTitle>
          {location ? <CardDescription>{location}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {summary?.total ?? 0} unidades no total
          </p>
          {summary && summary.total > 0 ? (
            <div className="flex flex-wrap gap-2">
              {unitStatusLegend.map(({ status, label, color }) => {
                const count = summary[status]
                if (!count) return null

                return (
                  <span key={status} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`size-2 rounded-full ${color}`} />
                    {count} {label.toLowerCase()}
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma unidade cadastrada</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export function BuildingsPage() {
  const { can } = useBuilderPermissions()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setError(null)
      setBuildings(await builderApi.listBuildings())
    } catch {
      setError('Não foi possível carregar os empreendimentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreateBuilding(e: React.FormEvent) {
    e.preventDefault()
    await builderApi.createBuilding({ name, published: false })
    setName('')
    await load()
  }

  return (
    <BuilderDashboardShell title="Empreendimentos">
      <div className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {can('buildings.manage') ? (
          <form onSubmit={handleCreateBuilding} className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Nome do novo empreendimento"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Button type="submit">Novo empreendimento</Button>
          </form>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {unitStatusLegend.map(({ status, label, color }) => (
            <span key={status} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`size-2.5 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {buildings.map((building) => (
              <BuildingCard key={building.id} building={building} />
            ))}
          </div>
        )}

        {!loading && buildings.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum empreendimento cadastrado.</p>
        )}
      </div>
    </BuilderDashboardShell>
  )
}
