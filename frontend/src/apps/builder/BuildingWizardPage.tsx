import { useParams } from 'react-router-dom'
import { BuildingWizard, useBuildingWizard } from '@/apps/builder/components/BuildingWizardProvider'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'

function BuildingWizardShell() {
  const { state } = useBuildingWizard()

  return (
    <BuilderDashboardShell title={state.buildingId ? 'Continuar cadastro' : 'Novo empreendimento'}>
      <BuildingWizard.Frame>
        <BuildingWizard.Steps />
        <BuildingWizard.Error />
        <BuildingWizard.CurrentStep />
        <BuildingWizard.Footer />
      </BuildingWizard.Frame>
    </BuilderDashboardShell>
  )
}

export function BuildingWizardPage() {
  const { buildingId } = useParams()

  return (
    <BuildingWizard.Provider buildingId={buildingId}>
      <BuildingWizardShell />
    </BuildingWizard.Provider>
  )
}
