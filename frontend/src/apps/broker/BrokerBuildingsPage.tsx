import { useEffect, useMemo, useState } from 'react'
import { unitStatusLegend } from '@/apps/builder/lib/unit-status'
import { BrokerDashboardShell } from '@/apps/broker/components/BrokerDashboardShell'
import { BrokerUnitsDialog } from '@/apps/broker/components/BrokerUnitsDialog'
import {
  filterBuildings,
  getBuilderFilterOptions,
  groupUnitsByBuilding,
  summarizeUnits,
  type BuildingWithUnits,
} from '@/apps/broker/lib/group-units-by-building'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { brokerApi } from '@/lib/api'

function BuildingCard({
  building,
  onOpen,
}: {
  building: BuildingWithUnits
  onOpen: (building: BuildingWithUnits) => void
}) {
  const summary = summarizeUnits(building.units)
  const builderName = building.tenant?.name
  const location = [building.city, building.state].filter(Boolean).join(' / ')

  return (
    <button
      type="button"
      className="block w-full text-left transition-opacity hover:opacity-90"
      onClick={() => onOpen(building)}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">{building.name}</CardTitle>
          {location ? <CardDescription>{location}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{summary.total} unidades liberadas</p>
          {summary.total > 0 ? (
            <div className="flex flex-wrap gap-2">
              {unitStatusLegend.map(({ status, label, color }) => {
                const count = summary[status]
                if (!count) {
                  return null
                }

                return (
                  <span
                    key={status}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span className={`size-2 rounded-full ${color}`} />
                    {count} {label.toLowerCase()}
                  </span>
                )
              })}
            </div>
          ) : null}
        </CardContent>
        {builderName ? (
          <CardFooter className="text-sm text-muted-foreground">{builderName}</CardFooter>
        ) : null}
      </Card>
    </button>
  )
}

export function BrokerBuildingsPage() {
  const [buildings, setBuildings] = useState<BuildingWithUnits[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingWithUnits | null>(null)
  const [unitsDialogOpen, setUnitsDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [builderId, setBuilderId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const builderOptions = useMemo(() => getBuilderFilterOptions(buildings), [buildings])

  const filteredBuildings = useMemo(
    () => filterBuildings(buildings, { search, builderId }),
    [buildings, search, builderId],
  )

  async function load() {
    try {
      setError(null)
      const nextBuildings = groupUnitsByBuilding(await brokerApi.listUnits())
      setBuildings(nextBuildings)
      setSelectedBuilding((current) => {
        if (!current) {
          return null
        }

        return nextBuildings.find((building) => building.id === current.id) ?? current
      })
    } catch {
      setError('Faça login como corretor para ver empreendimentos liberados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function handleOpenBuilding(building: BuildingWithUnits) {
    setSelectedBuilding(building)
    setUnitsDialogOpen(true)
  }

  return (
    <BrokerDashboardShell title="Empreendimentos">
      <div className="flex flex-col gap-8">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!loading && buildings.length > 0 ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="building-search">Empreendimento</Label>
              <Input
                id="building-search"
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-72">
              <Label htmlFor="builder-filter">Construtora</Label>
              <select
                id="builder-filter"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={builderId}
                onChange={(e) => setBuilderId(e.target.value)}
              >
                <option value="">Todas as construtoras</option>
                {builderOptions.map((builder) => (
                  <option key={builder.id} value={String(builder.id)}>
                    {builder.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredBuildings.map((building) => (
                <BuildingCard
                  key={building.id}
                  building={building}
                  onOpen={handleOpenBuilding}
                />
              ))}
            </div>
            {buildings.length === 0 && !error ? (
              <p className="text-sm text-muted-foreground">
                Nenhum empreendimento liberado ainda.
              </p>
            ) : null}
            {buildings.length > 0 && filteredBuildings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum empreendimento encontrado com os filtros selecionados.
              </p>
            ) : null}
          </>
        )}
      </div>

      <BrokerUnitsDialog
        open={unitsDialogOpen}
        onOpenChange={setUnitsDialogOpen}
        building={selectedBuilding}
        onReserved={() => void load()}
      />
    </BrokerDashboardShell>
  )
}
