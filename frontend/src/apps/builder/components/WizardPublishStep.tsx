import { useEffect, useState } from 'react'
import { BuildingDefaultsCard } from '@/apps/builder/components/BuildingDefaultsCard'
import { BuildingWizardMediaStep } from '@/apps/builder/components/BuildingWizardMediaStep'
import { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'
import { builderApi, type Amenity } from '@/lib/api'

export function WizardPublishStep() {
  const { state, actions } = useBuildingWizard()
  const [amenities, setAmenities] = useState<Amenity[]>([])

  useEffect(() => {
    let cancelled = false

    void builderApi.listAmenities().then((items) => {
      if (!cancelled) {
        setAmenities(items)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <div>
        <h2 className="text-base font-semibold">Fotos e descritivo</h2>
        <p className="text-sm text-muted-foreground">
          Envie as fotos, marque as características e escreva o descritivo. Dá para publicar sem esses itens.
        </p>
      </div>
      <BuildingDefaultsCard defaults={state.defaults} amenities={amenities} onChange={actions.setDefaults} />
      {state.buildingId ? (
        <BuildingWizardMediaStep
          buildingId={state.buildingId}
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
