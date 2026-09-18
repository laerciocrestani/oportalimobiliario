import {
  BuildingWizardTowersStep,
  TowerDraftFields,
} from '@/apps/builder/components/BuildingWizardTowersStep'
import { BuildingWizardUnitsStep } from '@/apps/builder/components/BuildingWizardUnitsStep'
import { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'

export function WizardStructureStep() {
  const { state, actions } = useBuildingWizard()
  const selectedTower = state.towers[state.selectedTowerIndex] ?? state.towers[0]
  const hasGrids = state.unitGrids.length > 0
  const selectedTowerIndex = Math.min(state.selectedTowerIndex, state.towers.length - 1)

  return (
    <>
      <div>
        <h2 className="text-base font-semibold">Estrutura</h2>
        <p className="text-sm text-muted-foreground">
          Defina torres, andares e unidades. O editor visual em pilha entra neste passo.
          {selectedTower
            ? ` Selecionado: ${selectedTower.name || 'torre'}, andar ${state.selectedFloor ?? 1}.`
            : null}
        </p>
      </div>

      {hasGrids ? (
        <div className="flex flex-col gap-6">
          <TowerDraftFields
            towers={state.towers}
            selectedTowerIndex={selectedTowerIndex}
            onChange={actions.setTowers}
            onSelectTower={actions.setSelectedTowerIndex}
          />
          <BuildingWizardUnitsStep
            grids={state.unitGrids}
            selectedTowerIndex={Math.min(state.selectedTowerIndex, Math.max(state.unitGrids.length - 1, 0))}
            selectedFloor={state.selectedFloor}
            defaults={state.buildingDefaults}
            amenities={state.amenities}
            onChange={actions.setUnitGrids}
            onDefaultsChange={actions.setBuildingDefaults}
            onSelectTower={actions.setSelectedTowerIndex}
            onSelectFloor={(towerIndex, floor) => {
              actions.setSelectedTowerIndex(towerIndex)
              actions.setSelectedFloor(floor)
            }}
          />
        </div>
      ) : (
        <BuildingWizardTowersStep
          towers={state.towers}
          selectedTowerIndex={selectedTowerIndex}
          selectedFloor={state.selectedFloor}
          onChange={actions.setTowers}
          onSelectTower={actions.setSelectedTowerIndex}
          onSelectFloor={(_towerIndex, floor) => actions.setSelectedFloor(floor)}
        />
      )}
    </>
  )
}
