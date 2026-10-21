import { Navigate, useParams } from 'react-router-dom'
import { BuildingWizardPage } from '@/apps/builder/BuildingWizardPage'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'

export function BuildingEditPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const { can, loading } = useBuilderPermissions()

  if (!loading && !can('buildings.manage')) {
    return <Navigate to={buildingId ? `/buildings/${buildingId}` : '/buildings'} replace />
  }

  return <BuildingWizardPage />
}
