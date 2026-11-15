import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BedIcon,
  Building2Icon,
  CheckIcon,
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  CopyPlusIcon,
  CrownIcon,
  DoorOpenIcon,
  EllipsisVerticalIcon,
  Flower2Icon,
  GalleryVerticalIcon,
  HotelIcon,
  LampIcon,
  LayersIcon,
  ListFilterIcon,
  PlusIcon,
  StoreIcon,
  Trash2Icon,
  WarehouseIcon,
  type LucideIcon,
} from 'lucide-react'
import { addFloor, duplicateFloor, duplicateFloorInsertNumber, duplicateUnit, floorKindLabel, floorLabel, floorPurposeOptions, floorStackLabel, floorUnitTypeLabel, floorUnitTypeOptions, floorsTopToBottom, isBelowEntranceHall, removeFloor, removeUnit, resizeFloorUnits, setFloorPurpose, setFloorUnitType, unitCharacteristics, type StackFloor, type StackUnit } from '@/apps/builder/lib/floor-stack'
import { inccToBrl } from '@/apps/builder/lib/incc-price'
import { formatGroupedInteger } from '@/apps/builder/lib/unit-input-mask'
import { useStructureEditor } from '@/apps/builder/components/structure-editor-context'
import { StructureEditor } from '@/apps/builder/components/StructureEditor'
import { ConfirmRemovalDialog } from '@/apps/builder/components/ConfirmRemovalDialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldLegend, FieldSet } from '@/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FloorKind, FloorUnitType } from '@/lib/api'
import { cn } from '@/lib/utils'

type FloorFilter = 'all' | FloorKind

const FILTERS: { value: FloorFilter; label: string }[] = [
  { value: 'all', label: 'Todos os pavimentos' },
  { value: 'residential', label: 'Residencial' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'hall', label: 'Hall' },
  { value: 'garage', label: 'Garagem' },
]

function unitNoun(count: number): string {
  return count === 1 ? 'unidade' : 'unidades'
}

const FLOOR_ROW_TONE = {
  hall: 'bg-amber-100 dark:bg-amber-950/40',
  residential: 'bg-[#e4efe0] dark:bg-[#1c2b1e]',
  commercial: 'bg-orange-100 dark:bg-orange-950/35',
  garage: 'bg-sky-100 dark:bg-sky-950/40',
  basement: 'bg-violet-100 dark:bg-violet-950/40',
} as const

function floorBadgeLabel(number: number, belowHall: boolean): string {
  if (belowHall && number >= 0) {
    return 'Subsolo'
  }

  if (number < 0) {
    return `Subsolo ${Math.abs(number)}`
  }

  if (number === 0) {
    return 'Térreo'
  }

  return `${number} pavimento`
}

function floorRowTone(floor: StackFloor, belowHall: boolean): keyof typeof FLOOR_ROW_TONE {
  if (belowHall || floor.number < 0) {
    return 'basement'
  }

  return floor.kind
}

function displayedKind(floor: StackFloor, floors: StackFloor[]): StackFloor['kind'] {
  return isBelowEntranceHall(floor.number, floors) ? 'garage' : floor.kind
}

const PURPOSE_ICONS: Record<'hall' | 'residential' | 'commercial' | 'garage', LucideIcon> = {
  hall: DoorOpenIcon,
  residential: Building2Icon,
  commercial: StoreIcon,
  garage: WarehouseIcon,
}

const TYPE_ICONS: Record<FloorUnitType, LucideIcon> = {
  apartment: Building2Icon,
  penthouse: CrownIcon,
  duplex: LayersIcon,
  triplex: GalleryVerticalIcon,
  garden: Flower2Icon,
  loft: LampIcon,
  studio: BedIcon,
  flat: HotelIcon,
  store: StoreIcon,
}

function floorIcon(kind: FloorKind): LucideIcon {
  return PURPOSE_ICONS[kind]
}

function formatMoney(value: string): string {
  const normalized = value.trim().replace(',', '.')
  const amount = Number(normalized)

  if (normalized === '' || !Number.isFinite(amount)) {
    return '—'
  }

  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatArea(value: string): string {
  const normalized = value.trim().replace(',', '.')
  const amount = Number(normalized)

  if (normalized === '' || !Number.isFinite(amount)) {
    return '—'
  }

  return `${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`
}

export function StructureFloorMap() {
  const { actions, meta } = useStructureEditor()
  const tower = meta.selectedTower
  const floor = meta.selectedFloor
  const [filter, setFilter] = useState<FloorFilter>('all')
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(null)
  const [openFloor, setOpenFloor] = useState<number | null>(floor?.number ?? null)
  const [copiedCharacteristics, setCopiedCharacteristics] = useState<Partial<StackUnit> | null>(null)
  const floors = tower ? floorsTopToBottom(tower.floors) : []
  const visibleFloors = filter === 'all' ? floors : floors.filter((item) => displayedKind(item, floors) === filter)
  const selectedUnit = floor?.units.find((unit) => unit.key === selectedUnitKey) ?? null

  useEffect(() => {
    setOpenFloor(floor?.number ?? null)
  }, [floor?.number])

  function insertFloor(where: 'above' | 'basement') {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">Mapa de pavimentos</h3>
        <p className="text-sm text-muted-foreground">Selecione um pavimento e escolha a unidade para editar.</p>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)]">
        <Card size="sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button type="button" variant="outline" size="icon" aria-label="Adicionar" />}
                  >
                    <PlusIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => insertFloor('above')}>
                        <ArrowUpIcon />
                        Adicionar pavimento
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => insertFloor('basement')}>
                        <ArrowDownIcon />
                        Adicionar subsolo
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
                    <ListFilterIcon data-icon="inline-start" />
                    Filtros
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Tipo de pavimento</DropdownMenuLabel>
                      {FILTERS.map((item) => (
                        <DropdownMenuItem key={item.value} onClick={() => setFilter(item.value)}>
                          {item.label}
                          {filter === item.value ? <CheckIcon className="ml-auto" /> : null}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {visibleFloors.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Nenhum pavimento nesse filtro.</p>
            ) : (
              visibleFloors.map((item) => (
                <FloorRow
                  key={item.number}
                  floor={item}
                  belowHall={isBelowEntranceHall(item.number, floors)}
                  stackLabel={floorStackLabel(item.number, floors)}
                  selected={floor?.number === item.number}
                  expanded={openFloor === item.number}
                  selectedUnitKey={selectedUnit?.key ?? null}
                  onSelect={() => {
                    setSelectedUnitKey(null)

                    if (openFloor === item.number) {
                      setOpenFloor(null)
                      return
                    }

                    setOpenFloor(item.number)
                    actions.selectFloor(item.number)
                  }}
                  onShowDetails={() => {
                    setSelectedUnitKey(null)
                    actions.selectFloor(item.number)
                  }}
                  onSelectUnit={setSelectedUnitKey}
                  onExpand={() => {
                    setOpenFloor(item.number)
                    actions.selectFloor(item.number)
                  }}
                  copiedCharacteristics={copiedCharacteristics}
                  onCopyCharacteristics={(source) => setCopiedCharacteristics(unitCharacteristics(source))}
                />
              ))
            )}
          </CardContent>
        </Card>

        {selectedUnit ? (
          <StructureEditor.SelectedUnit unit={selectedUnit} />
        ) : floor ? (
          <FloorDetails floor={floor} />
        ) : (
          <StructureEditor.SelectedUnit unit={null} />
        )}
      </div>
    </div>
  )
}

function FloorDetails({ floor }: { floor: StackFloor }) {
  const { actions, meta } = useStructureEditor()
  const tower = meta.selectedTower
  const towerFloors = tower?.floors ?? []
  const belowHall = isBelowEntranceHall(floor.number, towerFloors)
  const kind = belowHall ? 'garage' : floor.kind
  const purposes = floorPurposeOptions(floor.number, towerFloors)
  const types = floorUnitTypeOptions(kind, floor.number, towerFloors)
  const typeLabel = belowHall || floor.unitType == null ? null : floorUnitTypeLabel(floor.unitType)
  const KindIcon = floorIcon(kind)

  function choosePurpose(kind: 'hall' | 'residential' | 'commercial' | 'garage') {
    if (!tower || kind === floor.kind) {
      return
    }

    actions.updateTower(setFloorPurpose(tower, floor.number, kind))
  }

  function chooseType(unitType: FloorUnitType) {
    if (!tower || unitType === floor.unitType) {
      return
    }

    actions.updateTower(setFloorUnitType(tower, floor.number, unitType))
  }

  return (
    <Card size="sm" className="md:sticky md:top-4">
      <CardHeader>
        <CardTitle>{floorStackLabel(floor.number, towerFloors)}</CardTitle>
        <CardDescription>
          {floor.units.length} {unitNoun(floor.units.length)}
          {typeLabel ? ` · ${typeLabel}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {purposes.length > 0 ? (
          <FieldSet>
            <FieldLegend variant="label">Finalidade</FieldLegend>
            <ToggleGroup
              multiple={false}
              value={[floor.kind]}
              onValueChange={(value) => {
                const kind = value[0]

                if (kind === 'hall' || kind === 'residential' || kind === 'commercial' || kind === 'garage') {
                  choosePurpose(kind)
                }
              }}
              variant="outline"
              orientation="vertical"
              className="w-full"
            >
              {purposes.map((kind) => {
                const Icon = PURPOSE_ICONS[kind]

                return (
                  <ToggleGroupItem key={kind} value={kind} className="w-full justify-start">
                    <Icon data-icon="inline-start" />
                    {floorKindLabel(kind)}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </FieldSet>
        ) : (
          <FieldSet>
            <FieldLegend variant="label">Finalidade</FieldLegend>
            <div className="flex items-center gap-2 text-sm">
              <KindIcon className="size-4 text-primary" />
              {floorKindLabel(kind)}
            </div>
          </FieldSet>
        )}
        {types.length > 0 ? (
          <FieldSet>
            <FieldLegend variant="label">Tipo</FieldLegend>
            <ToggleGroup
              multiple={false}
              value={floor.unitType ? [floor.unitType] : []}
              onValueChange={(value) => {
                const unitType = value[0]

                if (unitType && unitType in TYPE_ICONS) {
                  chooseType(unitType as FloorUnitType)
                }
              }}
              variant="outline"
              orientation="vertical"
              className="w-full"
            >
              {types.map((unitType) => {
                const Icon = TYPE_ICONS[unitType]

                return (
                  <ToggleGroupItem key={unitType} value={unitType} className="w-full justify-start">
                    <Icon data-icon="inline-start" />
                    {floorUnitTypeLabel(unitType)}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </FieldSet>
        ) : null}
      </CardContent>
    </Card>
  )
}

function FloorRow({
  floor,
  belowHall,
  stackLabel,
  selected,
  expanded,
  selectedUnitKey,
  onSelect,
  onShowDetails,
  onSelectUnit,
  onExpand,
  copiedCharacteristics,
  onCopyCharacteristics,
}: {
  floor: StackFloor
  belowHall: boolean
  stackLabel: string
  selected: boolean
  expanded: boolean
  selectedUnitKey: string | null
  onSelect: () => void
  onShowDetails: () => void
  onSelectUnit: (unitKey: string) => void
  onExpand: () => void
  copiedCharacteristics: Partial<StackUnit> | null
  onCopyCharacteristics: (unit: StackUnit) => void
}) {
  const Icon = floorIcon(belowHall ? 'garage' : floor.kind)
  const unitsId = `floor-units-${floor.number}`
  const tone = floorRowTone(floor, belowHall)

  return (
    <div
      data-floor-tone={tone}
      className={cn(
        'flex w-full flex-col rounded-lg',
        FLOOR_ROW_TONE[tone],
        selected && 'ring-1 ring-foreground/15 ring-inset',
      )}
    >
      <FloorActionsMenu floor={floor} selected={selected} onSelectUnit={onSelectUnit} onExpand={onExpand}>
        {(menu) => (
      <>
      <div className="relative">
        <button
          type="button"
          aria-pressed={selected}
          aria-expanded={expanded}
          aria-controls={unitsId}
          aria-label={stackLabel}
          onClick={onSelect}
          className="absolute inset-0 rounded-lg"
        />
        <div className="pointer-events-none relative flex w-full items-center gap-3 px-2 py-3">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background/80 text-primary">
              <Icon className="size-4" />
            </span>
            <Badge>{floorBadgeLabel(floor.number, belowHall)}</Badge>
            {belowHall ? <Badge variant="outline">Garagem</Badge> : null}
            <Badge variant="secondary">
              {floor.units.length} {unitNoun(floor.units.length)}
            </Badge>
          </span>
          <span className="pointer-events-auto relative z-10">{menu}</span>
        </div>
      </div>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden" inert={expanded ? undefined : true} aria-hidden={expanded ? undefined : true}>
          <div id={unitsId} className="flex flex-wrap gap-2 p-2" onClick={onShowDetails}>
            {floor.units.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {floor.kind === 'hall' ? 'Hall não tem unidades privadas.' : 'Nenhuma unidade neste pavimento.'}
              </p>
            ) : (
              floor.units.map((unit) => (
                <UnitMiniCard
                  key={unit.key}
                  floor={floor}
                  unit={unit}
                  selected={selectedUnitKey === unit.key}
                  copiedCharacteristics={copiedCharacteristics}
                  onSelect={() => onSelectUnit(unit.key)}
                  onSelectUnit={onSelectUnit}
                  onCopyCharacteristics={() => onCopyCharacteristics(unit)}
                />
              ))
            )}
          </div>
        </div>
      </div>
      </>
        )}
      </FloorActionsMenu>
    </div>
  )
}

function UnitCardPrice({ unit }: { unit: StackUnit }) {
  const { meta } = useStructureEditor()
  const quantity = formatGroupedInteger(unit.priceBase)
  const incc = meta.priceMode === 'incc'
  const reais = incc ? inccToBrl(unit.priceBase, unit.priceCompetence, meta.inccIndices ?? []) : null
  const shown = incc ? (reais == null ? '—' : formatMoney(reais.toFixed(2))) : formatMoney(unit.priceBase)

  if (!incc || quantity === '') {
    return <span className="text-sm tabular-nums whitespace-nowrap">{shown}</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span title={`${quantity} INCC`} className="text-sm tabular-nums whitespace-nowrap" />}
      >
        {shown}
      </TooltipTrigger>
      <TooltipContent>{quantity} INCC</TooltipContent>
    </Tooltip>
  )
}

function UnitMiniCard({
  floor,
  unit,
  selected,
  copiedCharacteristics,
  onSelect,
  onSelectUnit,
  onCopyCharacteristics,
}: {
  floor: StackFloor
  unit: StackUnit
  selected: boolean
  copiedCharacteristics: Partial<StackUnit> | null
  onSelect: () => void
  onSelectUnit: (unitKey: string) => void
  onCopyCharacteristics: () => void
}) {
  return (
    <UnitActionsMenu
      floor={floor}
      unit={unit}
      copiedCharacteristics={copiedCharacteristics}
      onSelectUnit={onSelectUnit}
      onCopyCharacteristics={onCopyCharacteristics}
    >
      {(menu) => (
    <div className="relative w-fit shrink-0" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          'flex min-w-16 flex-col items-start gap-1 rounded-xl bg-card py-3 pr-8 pl-3 text-left ring-1 ring-foreground/10',
          selected && 'ring-2 ring-primary',
        )}
      >
        <span className="text-sm font-medium tabular-nums">{unit.code}</span>
        <UnitCardPrice unit={unit} />
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">{formatArea(unit.areaM2)}</span>
      </button>
      <div className="absolute top-1 right-1">{menu}</div>
    </div>
      )}
    </UnitActionsMenu>
  )
}

function FloorActionsMenu({
  floor,
  selected,
  onSelectUnit,
  onExpand,
  children,
}: {
  floor: StackFloor
  selected: boolean
  onSelectUnit: (unitKey: string) => void
  onExpand: () => void
  children: (menu: ReactNode) => ReactNode
}) {
  const { actions, meta } = useStructureEditor()
  const tower = meta.selectedTower
  const onlyFloor = (tower?.floors.length ?? 0) <= 1
  const hall = floor.kind === 'hall'
  const [confirming, setConfirming] = useState(false)

  function addUnit() {
    if (!tower || hall) {
      return
    }

    const next = resizeFloorUnits(tower, floor.number, floor.units.length + 1)
    actions.updateTower(next)
    onExpand()
    const created = next.floors.find((item) => item.number === floor.number)?.units.at(-1)

    if (created) {
      onSelectUnit(created.key)
    }
  }

  function duplicate(direction: 'above' | 'below') {
    if (!tower) {
      return
    }

    actions.updateTower(duplicateFloor(tower, floor.number, direction))
    actions.selectFloor(duplicateFloorInsertNumber(floor.number, direction))
  }

  function remove() {
    if (!tower || onlyFloor) {
      return
    }

    const next = removeFloor(tower, floor.number)
    actions.updateTower(next)

    if (!selected) {
      return
    }

    const fallback = next.floors[next.floors.length - 1]

    if (fallback) {
      actions.selectFloor(fallback.number)
    }
  }

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger className="block w-full">
        {children(
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações do pavimento ${floor.number}`} />
              }
            >
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem disabled={hall} onClick={addUnit}>
                  <PlusIcon />
                  Adicionar unidade
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicate('above')}>
                  <ArrowUpIcon />
                  Duplicar pavimento acima
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicate('below')}>
                  <ArrowDownIcon />
                  Duplicar pavimento abaixo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={onlyFloor} onClick={() => setConfirming(true)}>
                  <Trash2Icon />
                  Remover pavimento
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>,
        )}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuGroup>
          <ContextMenuItem disabled={hall} onClick={addUnit}>
            <PlusIcon />
            Adicionar unidade
          </ContextMenuItem>
          <ContextMenuItem onClick={() => duplicate('above')}>
            <ArrowUpIcon />
            Duplicar pavimento acima
          </ContextMenuItem>
          <ContextMenuItem onClick={() => duplicate('below')}>
            <ArrowDownIcon />
            Duplicar pavimento abaixo
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" disabled={onlyFloor} onClick={() => setConfirming(true)}>
            <Trash2Icon />
            Remover pavimento
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
    <ConfirmRemovalDialog
      open={confirming}
      title={`Remover ${floorLabel(floor.number)}?`}
      description="O pavimento e as unidades dele saem da estrutura."
      onOpenChange={setConfirming}
      onConfirm={remove}
    />
  </>
  )
}

function UnitActionsMenu({
  floor,
  unit,
  copiedCharacteristics,
  onSelectUnit,
  onCopyCharacteristics,
  children,
}: {
  floor: StackFloor
  unit: StackUnit
  copiedCharacteristics: Partial<StackUnit> | null
  onSelectUnit: (unitKey: string) => void
  onCopyCharacteristics: () => void
  children: (menu: ReactNode) => ReactNode
}) {
  const { actions, meta } = useStructureEditor()
  const tower = meta.selectedTower
  const onlyUnit = floor.units.length <= 1
  const [confirming, setConfirming] = useState(false)
  const noun = 'unidade'

  function duplicate() {
    if (!tower) {
      return
    }

    const next = duplicateUnit(tower, floor.number, unit.key)
    actions.updateTower(next)
    const created = next.floors.find((item) => item.number === floor.number)?.units.at(-1)

    if (created) {
      onSelectUnit(created.key)
    }
  }

  function paste() {
    if (!copiedCharacteristics) {
      return
    }

    actions.updateUnit(unit.key, copiedCharacteristics)
    onSelectUnit(unit.key)
  }

  function remove() {
    if (!tower || onlyUnit) {
      return
    }

    actions.updateTower(removeUnit(tower, floor.number, unit.key))
  }

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger className="block w-fit">
        {children(
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações da unidade ${unit.code}`} />}
            >
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={duplicate}>
                  <CopyPlusIcon />
                  Duplicar unidade
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCopyCharacteristics}>
                  <ClipboardCopyIcon />
                  Copiar características da unidade
                </DropdownMenuItem>
                <DropdownMenuItem disabled={copiedCharacteristics == null} onClick={paste}>
                  <ClipboardPasteIcon />
                  Colar características
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={onlyUnit} onClick={() => setConfirming(true)}>
                  <Trash2Icon />
                  Remover unidade
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>,
        )}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-72">
        <ContextMenuGroup>
          <ContextMenuItem onClick={duplicate}>
            <CopyPlusIcon />
            Duplicar unidade
          </ContextMenuItem>
          <ContextMenuItem onClick={onCopyCharacteristics}>
            <ClipboardCopyIcon />
            Copiar características da unidade
          </ContextMenuItem>
          <ContextMenuItem disabled={copiedCharacteristics == null} onClick={paste}>
            <ClipboardPasteIcon />
            Colar características
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" disabled={onlyUnit} onClick={() => setConfirming(true)}>
            <Trash2Icon />
            Remover unidade
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
    <ConfirmRemovalDialog
      open={confirming}
      title={`Remover ${noun} ${unit.code}?`}
      description={`A ${noun} ${unit.code} sai deste pavimento.`}
      onOpenChange={setConfirming}
      onConfirm={remove}
    />
    </>
  )
}
