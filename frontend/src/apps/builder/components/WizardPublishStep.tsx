import { BuildingWizardMediaStep } from '@/apps/builder/components/BuildingWizardMediaStep'
import { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'

export function WizardPublishStep() {
  const { state, actions } = useBuildingWizard()

  return (
    <>
      <div>
        <h2 className="text-base font-semibold">Mídia</h2>
        <p className="text-sm text-muted-foreground">
          Envie fotos internas e externas, escreva o descritivo e escolha se o cadastro continua
          como rascunho.
        </p>
      </div>
      {state.buildingId ? (
        <BuildingWizardMediaStep
          buildingId={Number(state.buildingId)}
          description={state.description}
          isDraft={state.isDraft}
          generating={state.generatingDescription}
          generateHint={state.generateHint}
          onDescriptionChange={actions.setDescription}
          onDraftChange={actions.setIsDraft}
          onGenerate={() => void actions.generateDescription()}
        />
      ) : null}
    </>
  )
}
