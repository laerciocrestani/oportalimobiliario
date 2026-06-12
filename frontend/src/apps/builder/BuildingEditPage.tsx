import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { BuildingEditForm } from '@/apps/builder/components/BuildingEditForm'
import { BuildingMediaGallery } from '@/apps/builder/components/BuildingMediaGallery'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { builderApi, type Building } from '@/lib/api'

export function BuildingEditPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const { can, loading: permissionsLoading } = useBuilderPermissions()
  const [building, setBuilding] = useState<Building | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  if (!permissionsLoading && !can('buildings.manage')) {
    return <Navigate to={buildingId ? `/buildings/${buildingId}` : '/buildings'} replace />
  }

  return (
    <BuilderDashboardShell title={building ? `Editar ${building.name}` : 'Editar empreendimento'}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link to="/buildings" className="hover:text-foreground">
              Empreendimentos
            </Link>
            <span>/</span>
            {building ? (
              <>
                <Link to={`/buildings/${building.id}`} className="hover:text-foreground">
                  {building.name}
                </Link>
                <span>/</span>
                <span>Editar</span>
              </>
            ) : (
              <span>...</span>
            )}
          </div>

          {building ? (
            <Link
              to={`/buildings/${building.id}`}
              className="inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              Voltar
            </Link>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {building ? (
          <>
            <BuildingEditForm building={building} onSaved={setBuilding} />
            <BuildingMediaGallery buildingId={building.id} />
          </>
        ) : null}
      </div>
    </BuilderDashboardShell>
  )
}
