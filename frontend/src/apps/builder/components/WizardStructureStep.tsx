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
          Gere o esqueleto, clone o andar-espelho e ajuste as exceções. Vagas ficam nos subsolos.
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
          setMirror: actions.setMirror,
          cloneMirror: actions.cloneMirror,
        }}
        meta={{ selectedTower, selectedFloor }}
      >
        <StructureEditor.Skeleton />
        <StructureEditor.TowerTabs />
        <StructureEditor.MirrorPanel />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <StructureEditor.FloorStack />
          <StructureEditor.UnitEditor />
          <StructureEditor.GaragePanel />
        </div>
      </StructureEditor.Provider>
    </>
  )
}
