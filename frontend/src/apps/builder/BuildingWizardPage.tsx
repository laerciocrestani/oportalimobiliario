import { useParams } from 'react-router-dom'
import { BuildingWizard, useBuildingWizard } from '@/apps/builder/components/BuildingWizardProvider'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { Badge } from '@/components/ui/badge'

function BuildingWizardShell() {
  const { state } = useBuildingWizard()
  const name = state.form.name.trim()
  const showDraft = !state.updatingExisting && state.isDraft

  return (
    <BuilderDashboardShell
      fill
      title={
        state.updatingExisting
          ? `Editar ${name || 'empreendimento'}`
          : state.buildingId
            ? 'Continuar cadastro'
            : 'Novo empreendimento'
      }
      detail={
        <>
          {name && !state.updatingExisting ? <span className="truncate text-base font-medium">{name}</span> : null}
          {showDraft ? <Badge variant="secondary">Rascunho</Badge> : null}
        </>
      }
    >
      <BuildingWizard.Frame>
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
