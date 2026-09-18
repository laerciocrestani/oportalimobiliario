import type { ReactNode } from 'react'
import {
  floorKindLabel,
  floorLabel,
  floorsTopToBottom,
  type SkeletonInput,
} from '@/apps/builder/lib/floor-stack'
import {
  StructureEditorContext,
  useStructureEditor,
  type StructureEditorActions,
  type StructureEditorMeta,
  type StructureEditorState,
} from '@/apps/builder/components/structure-editor-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

export { useStructureEditor } from '@/apps/builder/components/structure-editor-context'

type ProviderProps = {
  state: StructureEditorState
  actions: StructureEditorActions
  meta: StructureEditorMeta
  children: ReactNode
}

function StructureEditorProvider({ state, actions, meta, children }: ProviderProps) {
  return <StructureEditorContext value={{ state, actions, meta }}>{children}</StructureEditorContext>
}

function clampCount(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || value < min) {
    return min
  }

  return Math.min(max, value)
}

function StructureEditorSkeleton() {
  const { state, actions } = useStructureEditor()

  function update(field: keyof SkeletonInput, min: number, max: number, raw: string) {
    actions.setSkeleton({ [field]: clampCount(Number(raw), min, max) })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Esqueleto do prédio</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field>
            <FieldLabel htmlFor="structure-tower-count">Torres</FieldLabel>
            <Input
              id="structure-tower-count"
              type="number"
              min={1}
              max={26}
              value={state.skeleton.towerCount}
              onChange={(event) => update('towerCount', 1, 26, event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="structure-floors-above">Andares acima</FieldLabel>
            <Input
              id="structure-floors-above"
              type="number"
              min={0}
              max={80}
              value={state.skeleton.floorsAbove}
              onChange={(event) => update('floorsAbove', 0, 80, event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="structure-basements">Subsolos</FieldLabel>
            <Input
              id="structure-basements"
              type="number"
              min={0}
              max={20}
              value={state.skeleton.basementCount}
              onChange={(event) => update('basementCount', 0, 20, event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="structure-units-per-floor">Unidades por andar</FieldLabel>
            <Input
              id="structure-units-per-floor"
              type="number"
              min={1}
              max={20}
              value={state.skeleton.unitsPerFloor}
              onChange={(event) => update('unitsPerFloor', 1, 20, event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="structure-spots-per-basement">Vagas por subsolo</FieldLabel>
            <Input
              id="structure-spots-per-basement"
              type="number"
              min={1}
              max={40}
              value={state.skeleton.spotsPerBasement ?? state.skeleton.unitsPerFloor}
              onChange={(event) => update('spotsPerBasement', 1, 40, event.target.value)}
            />
          </Field>
        </FieldGroup>
        <Button type="button" className="mt-4" onClick={actions.generateSkeleton}>
          Gerar esqueleto
        </Button>
      </CardContent>
    </Card>
  )
}

function StructureEditorTowerTabs() {
  const { state, actions } = useStructureEditor()

  if (state.towers.length === 0) {
    return null
  }

  const selected = state.towers[state.selectedTowerIndex] ?? state.towers[0]

  return (
    <Tabs value={selected.key} onValueChange={(key) => {
      const index = state.towers.findIndex((tower) => tower.key === key)
      actions.selectTower(index < 0 ? 0 : index)
    }}>
      <TabsList>
        {state.towers.map((tower) => (
          <TabsTrigger key={tower.key} value={tower.key}>
            {tower.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function StructureEditorFloorRow({
  number,
  kind,
  customized,
  unitCount,
  selected,
  onSelect,
}: {
  number: number
  kind: 'residential' | 'commercial' | 'garage'
  customized: boolean
  unitCount: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left [content-visibility:auto]',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border',
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{floorLabel(number)}</span>
        <span className="text-xs text-muted-foreground">
          {unitCount} {kind === 'garage' ? 'vagas' : 'unidades'}
        </span>
      </span>
      <span className="flex flex-wrap justify-end gap-1">
        <Badge variant="secondary">{floorKindLabel(kind)}</Badge>
        {customized ? <Badge variant="warning">Exceção</Badge> : null}
      </span>
    </button>
  )
}

function StructureEditorFloorStack() {
  const { state, actions, meta } = useStructureEditor()

  if (!meta.selectedTower) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Andares</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {floorsTopToBottom(meta.selectedTower.floors).map((floor) => (
          <StructureEditorFloorRow
            key={floor.number}
            number={floor.number}
            kind={floor.kind}
            customized={floor.customized}
            unitCount={floor.units.length}
            selected={state.selectedFloorNumber === floor.number}
            onSelect={() => actions.selectFloor(floor.number)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function StructureEditorMirrorPanel() {
  const { state, actions, meta } = useStructureEditor()
  const tower = meta.selectedTower

  if (!tower) {
    return null
  }

  function updateDirection(value: string[]) {
    const direction = value[0]

    if (direction === 'up' || direction === 'down') {
      actions.setMirror({ direction })
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Andar-espelho</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="mirror-floor">Andar-espelho</FieldLabel>
            <select
              id="mirror-floor"
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none"
              value={state.mirror.referenceNumber}
              onChange={(event) => actions.setMirror({ referenceNumber: Number(event.target.value) })}
            >
              {floorsTopToBottom(tower.floors).map((floor) => (
                <option key={floor.number} value={floor.number}>
                  {floorLabel(floor.number)} · {floorKindLabel(floor.kind)}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel>Direção</FieldLabel>
            <ToggleGroup
              multiple={false}
              value={[state.mirror.direction]}
              onValueChange={updateDirection}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="up">Acima</ToggleGroupItem>
              <ToggleGroupItem value="down">Abaixo</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="mirror-from">De</FieldLabel>
            <Input
              id="mirror-from"
              type="number"
              value={state.mirror.from}
              onChange={(event) => actions.setMirror({ from: Number(event.target.value) })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="mirror-to">Até</FieldLabel>
            <Input
              id="mirror-to"
              type="number"
              value={state.mirror.to}
              onChange={(event) => actions.setMirror({ to: Number(event.target.value) })}
            />
          </Field>
        </FieldGroup>
        <Button type="button" className="mt-4" onClick={actions.cloneMirror}>
          Clonar
        </Button>
      </CardContent>
    </Card>
  )
}

function StructureEditorUnitEditor() {
  const { actions, meta } = useStructureEditor()
  const floor = meta.selectedFloor

  if (!floor || floor.kind === 'garage') {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          {floorLabel(floor.number)} · {floorKindLabel(floor.kind)}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {floor.units.map((unit) => (
          <FieldGroup key={unit.key} className="rounded-lg border p-3">
            <Field>
              <FieldLabel htmlFor={`unit-code-${unit.key}`}>Código {unit.code}</FieldLabel>
              <Input id={`unit-code-${unit.key}`} value={unit.code} readOnly />
            </Field>
            <Field>
              <FieldLabel htmlFor={`unit-area-${unit.key}`}>Área privativa {unit.code} (m²)</FieldLabel>
              <Input
                id={`unit-area-${unit.key}`}
                value={unit.areaM2}
                onChange={(event) => actions.updateUnit(unit.key, { areaM2: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`unit-bedrooms-${unit.key}`}>Quartos {unit.code}</FieldLabel>
              <Input
                id={`unit-bedrooms-${unit.key}`}
                inputMode="numeric"
                value={unit.bedrooms}
                onChange={(event) => actions.updateUnit(unit.key, { bedrooms: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`unit-bathrooms-${unit.key}`}>Banheiros {unit.code}</FieldLabel>
              <Input
                id={`unit-bathrooms-${unit.key}`}
                inputMode="numeric"
                value={unit.bathrooms}
                onChange={(event) => actions.updateUnit(unit.key, { bathrooms: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`unit-price-${unit.key}`}>Preço-base {unit.code}</FieldLabel>
              <Input
                id={`unit-price-${unit.key}`}
                value={unit.priceBase}
                onChange={(event) => actions.updateUnit(unit.key, { priceBase: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`unit-competence-${unit.key}`}>Competência {unit.code}</FieldLabel>
              <Input
                id={`unit-competence-${unit.key}`}
                placeholder="AAAA-MM"
                value={unit.priceCompetence}
                onChange={(event) => actions.updateUnit(unit.key, { priceCompetence: event.target.value })}
              />
            </Field>
          </FieldGroup>
        ))}
      </CardContent>
    </Card>
  )
}

function StructureEditorGaragePanel() {
  const { actions, meta } = useStructureEditor()
  const floor = meta.selectedFloor

  if (!floor || floor.kind !== 'garage') {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          Vagas · {floorLabel(floor.number)}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {floor.units.map((unit) => (
          <FieldGroup key={unit.key} className="rounded-lg border p-3">
            <Field>
              <FieldLabel htmlFor={`spot-code-${unit.key}`}>Código {unit.code}</FieldLabel>
              <Input id={`spot-code-${unit.key}`} value={unit.code} readOnly />
            </Field>
            <Field>
              <FieldLabel htmlFor={`spot-area-${unit.key}`}>Área {unit.code} (m²)</FieldLabel>
              <Input
                id={`spot-area-${unit.key}`}
                value={unit.areaM2}
                onChange={(event) => actions.updateUnit(unit.key, { areaM2: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`spot-price-${unit.key}`}>Preço-base {unit.code}</FieldLabel>
              <Input
                id={`spot-price-${unit.key}`}
                value={unit.priceBase}
                onChange={(event) => actions.updateUnit(unit.key, { priceBase: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`spot-competence-${unit.key}`}>Competência {unit.code}</FieldLabel>
              <Input
                id={`spot-competence-${unit.key}`}
                placeholder="AAAA-MM"
                value={unit.priceCompetence}
                onChange={(event) => actions.updateUnit(unit.key, { priceCompetence: event.target.value })}
              />
            </Field>
          </FieldGroup>
        ))}
      </CardContent>
    </Card>
  )
}

export const StructureEditor = {
  Provider: StructureEditorProvider,
  Skeleton: StructureEditorSkeleton,
  TowerTabs: StructureEditorTowerTabs,
  FloorStack: StructureEditorFloorStack,
  FloorRow: StructureEditorFloorRow,
  MirrorPanel: StructureEditorMirrorPanel,
  UnitEditor: StructureEditorUnitEditor,
  GaragePanel: StructureEditorGaragePanel,
}
