import { useState, type ReactNode } from 'react'
import {
  clonePreview,
  addFloor,
  removeFloor,
  removeUnit,
  floorKindLabel,
  floorLabel,
  floorsTopToBottom,
  resizeFloorUnits,
  setFloorKind,
  type SkeletonInput,
} from '@/apps/builder/lib/floor-stack'
import type { FloorKind } from '@/lib/api'
import {
  StructureEditorContext,
  useStructureEditor,
  type StructureEditorActions,
  type StructureEditorMeta,
  type StructureEditorState,
} from '@/apps/builder/components/structure-editor-context'
import { BuildingWizardEnumSelect } from '@/apps/builder/components/BuildingWizardEnumSelect'
import {
  CEILING_OPTIONS,
  FLOORING_OPTIONS,
  OPENING_OPTIONS,
  PROPERTY_POSITION_OPTIONS,
  SOLAR_OPTIONS,
  SUN_PERIOD_OPTIONS,
} from '@/apps/builder/lib/unit-spec'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  const { state, actions, meta } = useStructureEditor()

  function update(field: keyof SkeletonInput, min: number, max: number, raw: string) {
    actions.setSkeleton({ [field]: clampCount(Number(raw), min, max) })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Esqueleto do prédio</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {meta.singleTower ? null : (
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
          )}
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
  kind: 'residential' | 'commercial' | 'garage' | 'hall'
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

function RemoveUnitButton({ unitKey }: { unitKey: string }) {
  const { actions, meta } = useStructureEditor()
  const floor = meta.selectedFloor
  const tower = meta.selectedTower

  if (!floor || !tower) {
    return null
  }

  const isSpot = floor.kind === 'garage'
  const blocked = floor.kind !== 'hall' && floor.units.length <= 1

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={blocked}
      onClick={() => actions.updateTower(removeUnit(tower, floor.number, unitKey))}
    >
      Remover {isSpot ? 'vaga' : 'unidade'}
    </Button>
  )
}

function UnitPriceFields({
  unitKey,
  code,
  priceBase,
  priceCompetence,
}: {
  unitKey: string
  code: string
  priceBase: string
  priceCompetence: string
}) {
  const { actions, meta } = useStructureEditor()
  const fixed = meta.priceMode === 'fixed'

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`unit-price-${unitKey}`}>{fixed ? `Valor (R$) ${code}` : `Valor-base INCC ${code}`}</FieldLabel>
        <Input
          id={`unit-price-${unitKey}`}
          inputMode="decimal"
          value={priceBase}
          onChange={(event) => actions.updateUnit(unitKey, { priceBase: event.target.value })}
        />
      </Field>
      {fixed ? null : (
        <Field>
          <FieldLabel htmlFor={`unit-competence-${unitKey}`}>Competência {code}</FieldLabel>
          <Input
            id={`unit-competence-${unitKey}`}
            placeholder="AAAA-MM"
            value={priceCompetence}
            onChange={(event) => actions.updateUnit(unitKey, { priceCompetence: event.target.value })}
          />
        </Field>
      )}
    </>
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
      <CardContent className="flex flex-col gap-4">
        {floor.units.map((unit) => (
          <div key={unit.key} className="grid gap-3 rounded-lg border p-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="md:col-span-3 xl:col-span-6">
              <RemoveUnitButton unitKey={unit.key} />
            </div>
            <Field>
              <FieldLabel htmlFor={`unit-code-${unit.key}`}>Código</FieldLabel>
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
              <FieldLabel htmlFor={`unit-bedrooms-${unit.key}`}>Dormitórios {unit.code}</FieldLabel>
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
              <FieldLabel htmlFor={`unit-suites-${unit.key}`}>Suítes {unit.code}</FieldLabel>
              <Input
                id={`unit-suites-${unit.key}`}
                inputMode="numeric"
                value={unit.suites ?? ''}
                onChange={(event) => actions.updateUnit(unit.key, { suites: event.target.value })}
              />
            </Field>
            <UnitPriceFields
              unitKey={unit.key}
              code={unit.code}
              priceBase={unit.priceBase}
              priceCompetence={unit.priceCompetence}
            />
            <Field>
              <FieldLabel htmlFor={`unit-powder-${unit.key}`}>Lavabos {unit.code}</FieldLabel>
              <Input
                id={`unit-powder-${unit.key}`}
                inputMode="numeric"
                value={unit.powderRooms}
                onChange={(event) => actions.updateUnit(unit.key, { powderRooms: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`unit-balconies-${unit.key}`}>Sacadas {unit.code}</FieldLabel>
              <Input
                id={`unit-balconies-${unit.key}`}
                inputMode="numeric"
                value={unit.balconies}
                onChange={(event) => actions.updateUnit(unit.key, { balconies: event.target.value })}
              />
            </Field>
            <BuildingWizardEnumSelect
              id={`unit-position-${unit.key}`}
              label={`Posição ${unit.code}`}
              value={unit.propertyPosition}
              emptyLabel="Não informado"
              options={PROPERTY_POSITION_OPTIONS}
              onChange={(propertyPosition) => actions.updateUnit(unit.key, { propertyPosition })}
            />
            <BuildingWizardEnumSelect
              id={`unit-solar-${unit.key}`}
              label={`Sol ${unit.code}`}
              value={unit.solarPosition}
              emptyLabel="Não informado"
              options={SOLAR_OPTIONS}
              onChange={(solarPosition) => actions.updateUnit(unit.key, { solarPosition })}
            />
            <BuildingWizardEnumSelect
              id={`unit-sun-${unit.key}`}
              label={`Período ${unit.code}`}
              value={unit.sunPeriod}
              emptyLabel="Não informado"
              options={SUN_PERIOD_OPTIONS}
              onChange={(sunPeriod) => actions.updateUnit(unit.key, { sunPeriod })}
            />
            <BuildingWizardEnumSelect
              id={`unit-ceiling-${unit.key}`}
              label={`Forro ${unit.code}`}
              value={unit.ceilingType}
              emptyLabel="Não informado"
              options={CEILING_OPTIONS}
              onChange={(ceilingType) => actions.updateUnit(unit.key, { ceilingType })}
            />
            <BuildingWizardEnumSelect
              id={`unit-opening-${unit.key}`}
              label={`Aberturas ${unit.code}`}
              value={unit.openingType}
              emptyLabel="Não informado"
              options={OPENING_OPTIONS}
              onChange={(openingType) => actions.updateUnit(unit.key, { openingType })}
            />
            <BuildingWizardEnumSelect
              id={`unit-flooring-${unit.key}`}
              label={`Piso ${unit.code}`}
              value={unit.flooringType}
              emptyLabel="Não informado"
              options={FLOORING_OPTIONS}
              onChange={(flooringType) => actions.updateUnit(unit.key, { flooringType })}
            />
          </div>
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
            <RemoveUnitButton unitKey={unit.key} />
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
            <UnitPriceFields
              unitKey={unit.key}
              code={unit.code}
              priceBase={unit.priceBase}
              priceCompetence={unit.priceCompetence}
            />
          </FieldGroup>
        ))}
      </CardContent>
    </Card>
  )
}

function unitTypeLabel(kind: FloorKind): string {
  if (kind === 'garage') {
    return 'Vaga'
  }

  if (kind === 'commercial') {
    return 'Loja'
  }

  if (kind === 'hall') {
    return 'Área comum'
  }

  return 'Apartamento'
}

function floorKindChoices(number: number): FloorKind[] {
  if (number < 0) {
    return ['garage']
  }

  return ['residential', 'commercial', 'hall']
}

function StructureEditorFloorWorkspace() {
  const { state, actions, meta } = useStructureEditor()
  const floor = meta.selectedFloor
  const tower = meta.selectedTower
  const [editing, setEditing] = useState(false)
  const [cloning, setCloning] = useState(false)
  const preview = tower ? clonePreview(tower, state.mirror.referenceNumber, state.mirror) : []

  function remove() {
    if (!tower || !floor || tower.floors.length <= 1) {
      return
    }

    const next = removeFloor(tower, floor.number)
    actions.updateTower(next)
    const fallback = next.floors[next.floors.length - 1]

    if (fallback) {
      actions.selectFloor(fallback.number)
    }
  }

  function add(where: 'above' | 'basement') {
    if (!tower) {
      return
    }

    const next = addFloor(tower, where)
    actions.updateTower(next)
    const created = next.floors.find((item) => !tower.floors.some((current) => current.number === item.number))

    if (created) {
      actions.selectFloor(created.number)
    }
  }

  function chooseKind(kind: FloorKind) {
    if (!tower || !floor) {
      return
    }

    actions.updateTower(setFloorKind(tower, floor.number, kind))
  }

  function changeCount(delta: number) {
    if (!tower || !floor) {
      return
    }

    actions.updateTower(resizeFloorUnits(tower, floor.number, floor.units.length + delta))
  }

  function setCloneQuantity(quantity: number) {
    if (!tower) {
      return
    }

    const reference = tower.floors.find((item) => item.number === state.mirror.referenceNumber)

    if (!reference) {
      return
    }

    const candidates = tower.floors
      .filter(
        (item) =>
          item.kind === reference.kind &&
          (state.mirror.direction === 'up'
            ? item.number > reference.number
            : item.number < reference.number),
      )
      .toSorted((left, right) =>
        state.mirror.direction === 'up' ? left.number - right.number : right.number - left.number,
      )
      .slice(0, Math.max(1, quantity))

    if (candidates.length === 0) {
      return
    }

    const numbers = candidates.map((item) => item.number)
    actions.setMirror({ from: Math.min(...numbers), to: Math.max(...numbers) })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!tower}
            onClick={() => add('above')}
          >
            Adicionar andar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!tower}
            onClick={() => add('basement')}
          >
            Adicionar subsolo
          </Button>
        </div>
        <StructureEditorFloorStack />
      </div>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{floor ? floorLabel(floor.number) : 'Pavimento'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {floor ? (
            <p className="text-sm text-muted-foreground">
              {floorKindLabel(floor.kind)} · {floor.units.length}{' '}
              {floor.kind === 'garage' ? 'vagas' : 'unidades'}
              {floor.customized ? ' · exceção' : ''}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Gere o esqueleto e escolha um pavimento.</p>
          )}
          {floor && floor.units.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Código</th>
                  <th className="py-1 font-medium">Tipo</th>
                  <th className="py-1 font-medium">Área</th>
                  {floor.kind === 'garage' ? null : <th className="py-1 font-medium">Dormitórios</th>}
                </tr>
              </thead>
              <tbody>
                {floor.units.map((unit) => (
                  <tr key={unit.key} className="border-t">
                    <td className="py-1">{unit.code}</td>
                    <td className="py-1">{unitTypeLabel(floor.kind)}</td>
                    <td className="py-1">{unit.areaM2 || '—'}</td>
                    {floor.kind === 'garage' ? null : <td className="py-1">{unit.bedrooms || '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={!floor} onClick={() => setEditing(true)}>
              Editar pavimento
            </Button>
            <Button type="button" disabled={!floor} onClick={() => setCloning(true)}>
              Clonar pavimento
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!floor || (tower?.floors.length ?? 0) <= 1}
              onClick={() => remove()}
            >
              Remover pavimento
            </Button>
          </div>
        </CardContent>
      </Card>
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Editar pavimento</SheetTitle>
          </SheetHeader>
          {floor ? (
            <div className="flex flex-col gap-4 px-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Tipo de pavimento</legend>
                <div className="flex flex-wrap gap-3">
                  {floorKindChoices(floor.number).map((kind) => (
                    <label key={kind} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`floor-kind-${floor.number}`}
                        checked={floor.kind === kind}
                        onChange={() => chooseKind(kind)}
                      />
                      {floorKindLabel(kind)}
                    </label>
                  ))}
                </div>
              </fieldset>
              {floor.kind === 'hall' ? (
                <p className="text-sm text-muted-foreground">Hall não tem unidades privadas.</p>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {floor.kind === 'garage' ? 'Vagas' : 'Unidades'}
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => changeCount(-1)}>
                    −
                  </Button>
                  <span className="w-6 text-center text-sm">{floor.units.length}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => changeCount(1)}>
                    +
                  </Button>
                </div>
              )}
            </div>
          ) : null}
          <StructureEditorUnitEditor />
          <StructureEditorGaragePanel />
        </SheetContent>
      </Sheet>
      <Dialog open={cloning} onOpenChange={setCloning}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Clonar pavimento</DialogTitle>
          </DialogHeader>
          <StructureEditorMirrorPanel />
          {preview.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Pavimento</th>
                  <th className="py-1 font-medium">Numeração</th>
                  <th className="py-1 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.number} className="border-t">
                    <td className="py-1">{floorLabel(row.number)}</td>
                    <td className="py-1">{row.codes}</td>
                    <td className="py-1">{row.situation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum destino nessa faixa.</p>
          )}
          <Button type="button" variant="outline" onClick={() => setCloneQuantity(preview.length + 1)}>
            Incluir mais um destino
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const StructureEditor = {
  Provider: StructureEditorProvider,
  Skeleton: StructureEditorSkeleton,
  TowerTabs: StructureEditorTowerTabs,
  FloorStack: StructureEditorFloorStack,
  FloorWorkspace: StructureEditorFloorWorkspace,
  FloorRow: StructureEditorFloorRow,
  MirrorPanel: StructureEditorMirrorPanel,
  UnitEditor: StructureEditorUnitEditor,
  GaragePanel: StructureEditorGaragePanel,
}
