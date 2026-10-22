import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { StructureEditor } from '@/apps/builder/components/StructureEditor'
import { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        {state.stackTowers.length > 0 ? (
          <Button type="button" variant="outline" onClick={actions.addTowerCopy}>
            Adicionar torre
          </Button>
        ) : null}
      </div>
      {state.stackTowers.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {state.stackTowers.map((tower, index) => (
              <Button
                key={tower.key}
                type="button"
                size="sm"
                variant={index === state.selectedTowerIndex ? 'default' : 'outline'}
                onClick={() => actions.setSelectedTowerIndex(index)}
              >
                {tower.name}
              </Button>
            ))}
          </div>
          {selectedTower ? (
            <div className="flex max-w-xl flex-wrap items-end gap-3">
              <div className="min-w-60 flex-1">
                <Label htmlFor="wizard-tower-name">Nome da torre</Label>
                <Input
                  id="wizard-tower-name"
                  value={selectedTower.name}
                  onChange={(event) =>
                    actions.updateSelectedTower({ ...selectedTower, name: event.target.value })
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={state.stackTowers.length <= 1 || selectedTower.locked}
                onClick={actions.removeSelectedTower}
              >
                Remover torre
              </Button>
            </div>
          ) : null}
          {selectedTower?.locked ? (
            <p className="text-sm text-muted-foreground">
              Esta torre tem unidade vendida ou em reserva e não pode ser removida.
            </p>
          ) : null}
        </div>
      ) : null}
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
