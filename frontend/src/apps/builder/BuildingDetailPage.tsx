import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DigitalMirror } from '@/apps/builder/components/DigitalMirror'
import { TowerEditSheet } from '@/apps/builder/components/TowerEditSheet'
import { UnitDetailDrawer } from '@/apps/builder/components/UnitDetailDrawer'
import { UnitsTable } from '@/apps/builder/components/UnitsTable'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { builderApi, type Building, type Tower, type Unit } from '@/lib/api'

export function BuildingDetailPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const { can } = useBuilderPermissions()
  const [building, setBuilding] = useState<Building | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [towerEditOpen, setTowerEditOpen] = useState(false)
  const [editingTower, setEditingTower] = useState<Tower | null>(null)

  const loadBuilding = useCallback(async () => {
    if (!buildingId) {
      return
    }

    try {
      setError(null)
      setBuilding(await builderApi.getBuilding(Number(buildingId)))
    } catch {
      setError('Empreendimento não encontrado.')
    }
  }, [buildingId])

  useEffect(() => {
    void loadBuilding()
  }, [loadBuilding])

  function handleUnitSaved(updated: Unit) {
    setBuilding((current) => {
      if (!current) {
        return current
      }

      const units = (current.units ?? []).map((unit) =>
        unit.id === updated.id ? updated : unit,
      )

      const towers = (current.towers ?? []).map((tower) => ({
        ...tower,
        units: tower.units?.map((unit) => (unit.id === updated.id ? updated : unit)),
      }))

      return { ...current, units, towers }
    })
    setSelectedUnit(updated)
  }

  function handleTowerSaved(saved: Tower) {
    setBuilding((current) => {
      if (!current) {
        return current
      }

      const towers = current.towers ?? []
      const exists = towers.some((tower) => tower.id === saved.id)

      return {
        ...current,
        towers: exists
          ? towers.map((tower) => (tower.id === saved.id ? { ...tower, ...saved } : tower))
          : [...towers, saved].toSorted((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
      }
    })
  }

  function openTowerEdit(tower: Tower | null) {
    setEditingTower(tower)
    setTowerEditOpen(true)
  }

  const location = building ? [building.city, building.state].filter(Boolean).join(' / ') : ''
  const canManageBuildings = can('buildings.manage')
  const canManageUnits = can('units.manage')
  const canUpdateStatus = can('units.update_status')

  return (
    <BuilderDashboardShell title={building?.name ?? 'Empreendimento'}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/buildings" className="hover:text-foreground">
            Empreendimentos
          </Link>
          <span>/</span>
          <span>{building?.name ?? '...'}</span>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {building && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {location ? <p className="text-sm text-muted-foreground">{location}</p> : null}
              <Badge variant={building.published ? 'default' : 'secondary'}>
                {building.published ? 'Publicado' : 'Rascunho'}
              </Badge>
              {building.units_summary ? (
                <p className="text-sm text-muted-foreground">
                  {building.units_summary.total} unidades
                </p>
              ) : null}
              {canManageBuildings ? (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link to={`/buildings/${building.id}/edit`}>Editar empreendimento</Link>
                </Button>
              ) : null}
            </div>

            <Tabs defaultValue="units">
              <TabsList>
                <TabsTrigger value="units">Unidades</TabsTrigger>
                <TabsTrigger value="mirror">Espelho digital</TabsTrigger>
                {canManageBuildings ? <TabsTrigger value="towers">Torres</TabsTrigger> : null}
              </TabsList>

              <TabsContent value="units" className="mt-4">
                <UnitsTable
                  units={building.units ?? []}
                  towers={building.towers}
                  unitsSummary={building.units_summary}
                  onUnitSelect={setSelectedUnit}
                />
              </TabsContent>

              <TabsContent value="mirror" className="mt-4">
                <DigitalMirror
                  buildingName={building.name}
                  towers={building.towers ?? []}
                  onUnitSelect={setSelectedUnit}
                />
              </TabsContent>

              {canManageBuildings ? (
                <TabsContent value="towers" className="mt-4 space-y-4">
                  <div className="flex justify-end">
                    <Button type="button" size="sm" onClick={() => openTowerEdit(null)}>
                      Nova torre
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/40 text-left">
                        <tr>
                          <th className="px-4 py-3 font-medium">Nome</th>
                          <th className="px-4 py-3 font-medium">Ordem</th>
                          <th className="px-4 py-3 font-medium">Unidades</th>
                          <th className="px-4 py-3 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(building.towers ?? []).map((tower) => (
                          <tr key={tower.id} className="border-b last:border-b-0">
                            <td className="px-4 py-3 font-medium">{tower.name}</td>
                            <td className="px-4 py-3">{tower.sort_order}</td>
                            <td className="px-4 py-3">{tower.units_summary?.total ?? 0}</td>
                            <td className="px-4 py-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openTowerEdit(tower)}
                              >
                                Editar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(building.towers ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma torre cadastrada.</p>
                  ) : null}
                </TabsContent>
              ) : null}
            </Tabs>

            <UnitDetailDrawer
              unit={selectedUnit}
              buildingId={building.id}
              buildingName={building.name}
              towers={building.towers ?? []}
              open={selectedUnit !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedUnit(null)
                }
              }}
              canManage={canManageUnits}
              canUpdateStatus={canUpdateStatus}
              onSaved={handleUnitSaved}
            />

            {canManageBuildings ? (
              <TowerEditSheet
                  buildingId={building.id}
                  tower={editingTower}
                  open={towerEditOpen}
                  onOpenChange={setTowerEditOpen}
                  onSaved={handleTowerSaved}
              />
            ) : null}
          </>
        )}
      </div>
    </BuilderDashboardShell>
  )
}
