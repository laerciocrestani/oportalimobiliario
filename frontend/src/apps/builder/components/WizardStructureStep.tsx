import { StructureEditor } from '@/apps/builder/components/StructureEditor'
import { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'

export function WizardStructureStep() {
  const { state, actions } = useBuildingWizard()
  const selectedTower = state.stackTowers[state.selectedTowerIndex] ?? state.stackTowers[0] ?? null
  const selectedFloor =
    selectedTower?.floors.find((floor) => floor.number === state.selectedFloor) ?? null

  return (
    <>
      <div>
        <h2 className="text-base font-semibold">Estrutura</h2>
        <p className="text-sm text-muted-foreground">
          Gere uma torre, escolha o pavimento-modelo e clone para os outros andares. Vagas ficam no subsolo.
        </p>
      </div>

      <StructureEditor.Provider
        state={{
          towers: state.stackTowers,
          selectedTowerIndex: state.selectedTowerIndex,
          selectedFloorNumber: state.selectedFloor,
          skeleton: state.skeleton,
          mirror: state.mirror,
        }}
        actions={{
          setSkeleton: actions.setSkeleton,
          generateSkeleton: actions.generateSkeleton,
          selectTower: actions.setSelectedTowerIndex,
          selectFloor: actions.setSelectedFloor,
          updateUnit: actions.updateStackUnit,
          updateTower: actions.updateSelectedTower,
          setMirror: actions.setMirror,
          cloneMirror: actions.cloneMirror,
        }}
        meta={{
          selectedTower,
          selectedFloor,
          priceMode: state.form.priceMode,
          singleTower: true,
        }}
      >
        <StructureEditor.Skeleton />
        <StructureEditor.FloorWorkspace />
      </StructureEditor.Provider>
    </>
  )
}
