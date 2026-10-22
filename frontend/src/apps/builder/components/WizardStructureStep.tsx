import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { StructureEditor } from '@/apps/builder/components/StructureEditor'
import { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'

export function WizardStructureStep() {
  const { state, actions } = useBuildingWizard()
  const selectedTower = state.stackTowers[state.selectedTowerIndex] ?? state.stackTowers[0] ?? null
  const selectedFloor =
    selectedTower?.floors.find((floor) => floor.number === state.selectedFloor) ?? null

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Estrutura</h2>
          <p className="text-sm text-muted-foreground">
            Monte a estrutura de {state.form.name || 'o empreendimento'}. Crie um pavimento com suas unidades e replique o modelo para os demais andares.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Torre única</p>
      </div>
      <Alert>
        <AlertTitle>Um pavimento-modelo. Vários andares prontos.</AlertTitle>
        <AlertDescription>
          Selecione um pavimento e use Clonar pavimento para replicar todas as suas unidades, para cima ou para baixo.
        </AlertDescription>
      </Alert>

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
