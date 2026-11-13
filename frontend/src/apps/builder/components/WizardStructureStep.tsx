import { useState, type FormEvent } from 'react'
import { Building2Icon, PlusIcon } from 'lucide-react'
import { StructureEditor } from '@/apps/builder/components/StructureEditor'
import { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'
import { towerLetterName } from '@/apps/builder/lib/floor-stack'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function WizardStructureStep() {
  const { state, actions } = useBuildingWizard()
  const selectedTower = state.stackTowers[state.selectedTowerIndex] ?? state.stackTowers[0] ?? null
  const selectedFloor =
    selectedTower?.floors.find((floor) => floor.number === state.selectedFloor) ?? null
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [cloneExisting, setCloneExisting] = useState(false)
  const [sourceKey, setSourceKey] = useState<string | null>(null)
  const trimmedName = name.trim()
  const canAdd = trimmedName !== '' && (!cloneExisting || sourceKey != null)
  const sourceTower = state.stackTowers.find((tower) => tower.key === sourceKey) ?? null
  const [skeletonOpen, setSkeletonOpen] = useState(false)
  const hasStructure = state.stackTowers.length > 0

  function openDialog() {
    setName(towerLetterName(state.stackTowers.length))
    setCloneExisting(false)
    setSourceKey(selectedTower?.key ?? state.stackTowers[0]?.key ?? null)
    setDialogOpen(true)
  }

  function submitTower(event: FormEvent) {
    event.preventDefault()

    if (!canAdd) {
      return
    }

    actions.addTower({
      name: trimmedName,
      sourceKey: cloneExisting ? sourceKey : null,
    })
    setDialogOpen(false)
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Estrutura</h2>
        <p className="text-sm text-muted-foreground">
          Monte a estrutura de {state.form.name || 'o empreendimento'}. Crie um pavimento com suas unidades e replique o modelo para os demais andares.
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
        {hasStructure && selectedTower ? (
          <div className="flex items-center gap-3">
            <Tabs
              className="w-fit"
              value={selectedTower.key}
              onValueChange={(key) => {
                if (key == null) {
                  return
                }

                const index = state.stackTowers.findIndex((tower) => tower.key === key)

                if (index >= 0) {
                  actions.setSelectedTowerIndex(index)
                }
              }}
            >
              <div className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-full bg-muted p-1">
                <TabsList className="h-7 bg-transparent p-0">
                  {state.stackTowers.map((tower) => (
                    <TabsTrigger key={tower.key} value={tower.key} className="rounded-full px-3">
                      {tower.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="rounded-full"
                  aria-label="Adicionar torre"
                  onClick={openDialog}
                >
                  <PlusIcon />
                </Button>
              </div>
            </Tabs>
            <StructureEditor.Skeleton open={skeletonOpen} onOpenChange={setSkeletonOpen} />
          </div>
        ) : (
          <>
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building2Icon />
                </EmptyMedia>
                <EmptyTitle>Nenhuma estrutura ainda</EmptyTitle>
                <EmptyDescription>
                  Crie o esqueleto com andares e unidades, ou comece só com o hall de entrada.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button type="button" onClick={() => setSkeletonOpen(true)}>
                    Criar esqueleto do prédio
                  </Button>
                  <Button type="button" variant="outline" onClick={actions.startEntranceHall}>
                    Criar prédio manual
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
            <StructureEditor.Skeleton
              open={skeletonOpen}
              onOpenChange={setSkeletonOpen}
              showTrigger={false}
            />
          </>
        )}
        {hasStructure ? <StructureEditor.FloorWorkspace /> : null}
      </StructureEditor.Provider>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova torre</DialogTitle>
            <DialogDescription>
              Dê um nome para a torre. Se quiser, copie os dados de uma torre que já existe.
            </DialogDescription>
          </DialogHeader>
          <form id="wizard-add-tower" onSubmit={submitTower}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="wizard-new-tower-name">Nome da torre</FieldLabel>
                <Input
                  id="wizard-new-tower-name"
                  value={name}
                  autoFocus
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="wizard-clone-tower">Clonar dados de torre existente</FieldLabel>
                <Switch
                  id="wizard-clone-tower"
                  checked={cloneExisting}
                  onCheckedChange={setCloneExisting}
                />
              </Field>
              {cloneExisting ? (
                <Field>
                  <FieldLabel htmlFor="wizard-clone-source">Torre de origem</FieldLabel>
                  <Select
                    value={sourceKey}
                    onValueChange={(value) => {
                      if (value != null) {
                        setSourceKey(value)
                      }
                    }}
                  >
                    <SelectTrigger id="wizard-clone-source" className="w-full" aria-label="Torre de origem">
                      <SelectValue placeholder="Selecione a torre">
                        {sourceTower?.name ?? null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {state.stackTowers.map((tower) => (
                          <SelectItem key={tower.key} value={tower.key}>
                            {tower.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </FieldGroup>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="wizard-add-tower" disabled={!canAdd}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
