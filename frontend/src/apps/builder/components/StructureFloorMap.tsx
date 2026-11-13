import { useEffect, useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Building2Icon,
  CheckIcon,
  CopyPlusIcon,
  DoorOpenIcon,
  EllipsisVerticalIcon,
  ListFilterIcon,
  StoreIcon,
  Trash2Icon,
  WarehouseIcon,
  type LucideIcon,
} from 'lucide-react'
import { addFloor, duplicateFloor, duplicateFloorInsertNumber, duplicateUnit, floorKindLabel, floorLabel, floorPurposeOptions, floorUnitTypeLabel, floorUnitTypeOptions, floorsTopToBottom, isTopFloor, removeFloor, removeUnit, setFloorPurpose, setFloorUnitType, type StackFloor, type StackUnit } from '@/apps/builder/lib/floor-stack'
import { unitStatusLabels, type UnitStatus } from '@/apps/builder/lib/unit-status'
import { useStructureEditor } from '@/apps/builder/components/structure-editor-context'
import { StructureEditor } from '@/apps/builder/components/StructureEditor'
import { ConfirmRemovalDialog } from '@/apps/builder/components/ConfirmRemovalDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
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

function unitNoun(kind: FloorKind, count: number): string {
  if (kind === 'garage') {
    return count === 1 ? 'vaga' : 'vagas'
  }

  return count === 1 ? 'unidade' : 'unidades'
}

function floorIcon(kind: FloorKind): LucideIcon {
  if (kind === 'garage') {
    return WarehouseIcon
  }

  if (kind === 'commercial') {
    return StoreIcon
  }

  if (kind === 'hall') {
    return DoorOpenIcon
  }

  return Building2Icon
}

function isTaken(status: string | undefined): boolean {
  return status != null && status !== '' && status !== 'available'
}

function statusLabel(status: string | undefined): string {
  if (!isTaken(status)) {
    return 'Disponível'
  }

  if (status != null && status in unitStatusLabels) {
    return unitStatusLabels[status as UnitStatus]
  }

  return 'Ocupada'
}

function formatArea(value: string): string {
  const normalized = value.trim().replace(',', '.')
  const amount = Number(normalized)

  if (normalized === '' || !Number.isFinite(amount)) {
    return '—'
  }

  return `${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`
}

function floorOccupancy(floor: StackFloor): { occupied: number; available: number; percent: number } {
  const occupied = floor.units.filter((unit) => isTaken(unit.status)).length
  const available = floor.units.length - occupied
  const percent = floor.units.length === 0 ? 0 : Math.round((occupied / floor.units.length) * 100)

  return { occupied, available, percent }
}

export function StructureFloorMap({
  isDraft,
  onOpenSkeleton,
  onAddTower,
}: {
  isDraft: boolean
  onOpenSkeleton: () => void
  onAddTower: () => void
}) {
  const { actions, meta } = useStructureEditor()
  const tower = meta.selectedTower
  const floor = meta.selectedFloor
  const [filter, setFilter] = useState<FloorFilter>('all')
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(null)
  const [openFloor, setOpenFloor] = useState<number | null>(floor?.number ?? null)
  const floors = tower ? floorsTopToBottom(tower.floors) : []
  const visibleFloors = filter === 'all' ? floors : floors.filter((item) => item.kind === filter)
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Mapa de pavimentos</h3>
          <p className="text-sm text-muted-foreground">Selecione um pavimento e escolha a unidade para editar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
              <EllipsisVerticalIcon data-icon="inline-start" />
              Mais opções
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Estrutura</DropdownMenuLabel>
                <DropdownMenuItem onClick={onOpenSkeleton}>Esqueleto do prédio</DropdownMenuItem>
                <DropdownMenuItem onClick={onAddTower}>Adicionar torre</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => insertFloor('above')}>Adicionar pavimento</DropdownMenuItem>
                <DropdownMenuItem onClick={() => insertFloor('basement')}>Adicionar subsolo</DropdownMenuItem>
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
      </div>

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)]">
        <Card size="sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" />
                  Ocupado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                  Disponível
                </span>
              </div>
              <Badge variant={isDraft ? 'secondary' : 'default'}>
                {isDraft ? 'Rascunho' : 'Empreendimento ativo'}
              </Badge>
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
                  top={isTopFloor(floors, item.number)}
                  selected={floor?.number === item.number}
                  expanded={openFloor === item.number}
                  selectedUnitKey={selectedUnit?.key ?? null}
                  share={floorOccupancy(item).percent}
                  onSelect={() => {
                    if (openFloor === item.number) {
                      setOpenFloor(null)
                      return
                    }

                    setOpenFloor(item.number)
                    actions.selectFloor(item.number)
                  }}
                  onSelectUnit={setSelectedUnitKey}
                />
              ))
            )}
          </CardContent>
        </Card>

        <StructureEditor.SelectedUnit unit={selectedUnit} />
      </div>
    </div>
  )
}

function FloorRow({
  floor,
  top,
  selected,
  expanded,
  selectedUnitKey,
  share,
  onSelect,
  onSelectUnit,
}: {
  floor: StackFloor
  top: boolean
  selected: boolean
  expanded: boolean
  selectedUnitKey: string | null
  share: number
  onSelect: () => void
  onSelectUnit: (unitKey: string) => void
}) {
  const { actions, meta } = useStructureEditor()
  const tower = meta.selectedTower
  const Icon = floorIcon(floor.kind)
  const purposes = floor.number > 0 ? floorPurposeOptions(floor.number, tower?.floors ?? []) : []
  const types = floorUnitTypeOptions(floor.kind, top)
  const typeLabel =
    floor.kind === 'hall'
      ? 'Hall'
      : floor.unitType
        ? floorUnitTypeLabel(floor.unitType)
        : floor.kind === 'commercial'
          ? 'Loja'
          : 'Apartamento'

  function choosePurpose(kind: 'hall' | 'residential' | 'commercial' | 'garage') {
    if (!tower) {
      return
    }

    actions.updateTower(setFloorPurpose(tower, floor.number, kind))
  }

  function chooseType(unitType: FloorUnitType) {
    if (!tower) {
      return
    }

    actions.updateTower(setFloorUnitType(tower, floor.number, unitType))
  }

  const unitsId = `floor-units-${floor.number}`

  return (
    <div className={cn('flex w-full flex-col rounded-lg', selected ? 'bg-accent' : 'hover:bg-muted')}>
      <div className="flex w-full items-center gap-3 px-2 py-3">
      <button
        type="button"
        aria-pressed={selected}
        aria-expanded={expanded}
        aria-controls={unitsId}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex w-14 shrink-0 flex-col items-center gap-1">
          <span className="flex items-center gap-1">
            <span className="flex size-8 items-center justify-center rounded-md bg-muted text-primary">
              <Icon className="size-4" />
            </span>
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                selected ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground ring-1 ring-foreground/15',
              )}
            >
              {floor.number}
            </span>
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">{share}%</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium">{floorLabel(floor.number)}</span>
            <span className="shrink-0 text-sm text-muted-foreground">
              {floor.units.length} {unitNoun(floor.kind, floor.units.length)}
            </span>
          </span>
          <Progress value={share} />
        </span>
      </button>
      {purposes.length > 0 ? (
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="outline" size="sm" aria-label={`Finalidade do pavimento ${floor.number}`} />
              }
            >
              {floorKindLabel(floor.kind)}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Finalidade</DropdownMenuLabel>
                {purposes.map((kind) => (
                  <DropdownMenuItem key={kind} onClick={() => choosePurpose(kind)}>
                    {floorKindLabel(kind)}
                    {floor.kind === kind ? <CheckIcon className="ml-auto" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {types.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline" size="sm" aria-label={`Tipo do pavimento ${floor.number}`} />
                }
              >
                {typeLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Tipo</DropdownMenuLabel>
                  {types.map((unitType) => (
                    <DropdownMenuItem key={unitType} onClick={() => chooseType(unitType)}>
                      {floorUnitTypeLabel(unitType)}
                      {floor.unitType === unitType ? <CheckIcon className="ml-auto" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : floor.kind === 'hall' ? (
            <Button type="button" variant="outline" size="sm" disabled>
              Hall
            </Button>
          ) : null}
        </span>
      ) : null}
      {selected ? <CheckIcon className="size-4 shrink-0 text-primary" /> : <span className="size-4 shrink-0" />}
      <FloorActionsMenu floor={floor} selected={selected} />
      </div>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden" inert={expanded ? undefined : true} aria-hidden={expanded ? undefined : true}>
          <div id={unitsId} className="flex flex-wrap gap-2 px-2 pb-3">
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
                  onSelect={() => onSelectUnit(unit.key)}
                  onSelectUnit={onSelectUnit}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function UnitMiniCard({
  floor,
  unit,
  selected,
  onSelect,
  onSelectUnit,
}: {
  floor: StackFloor
  unit: StackUnit
  selected: boolean
  onSelect: () => void
  onSelectUnit: (unitKey: string) => void
}) {
  return (
    <Card size="sm" className={cn('w-fit shrink-0', selected && 'ring-2 ring-primary')}>
      <CardHeader>
        <div className="flex items-center justify-between gap-1">
          <button type="button" aria-pressed={selected} onClick={onSelect} className="text-left">
            <CardTitle className="tabular-nums">{unit.code}</CardTitle>
          </button>
          <UnitActionsMenu floor={floor} unit={unit} onSelectUnit={onSelectUnit} />
        </div>
        <button type="button" onClick={onSelect} className="text-left">
          <CardDescription className="tabular-nums">{formatArea(unit.areaM2)}</CardDescription>
        </button>
      </CardHeader>
      <CardContent>
        <button type="button" onClick={onSelect} className="text-left">
          <Badge variant={isTaken(unit.status) ? 'default' : 'secondary'}>{statusLabel(unit.status)}</Badge>
        </button>
      </CardContent>
    </Card>
  )
}

function FloorActionsMenu({
  floor,
  selected,
}: {
  floor: StackFloor
  selected: boolean
}) {
  const { actions, meta } = useStructureEditor()
  const tower = meta.selectedTower
  const onlyFloor = (tower?.floors.length ?? 0) <= 1
  const [confirming, setConfirming] = useState(false)

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
          <DropdownMenuItem onClick={() => duplicate('above')}>
            <ArrowUpIcon />
            Duplicar pavimento acima
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicate('below')}>
            <ArrowDownIcon />
            Duplicar pavimento abaixo
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={onlyFloor} onClick={() => setConfirming(true)}>
            <Trash2Icon />
            Remover pavimento
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
  onSelectUnit,
}: {
  floor: StackFloor
  unit: StackUnit
  onSelectUnit: (unitKey: string) => void
}) {
  const { actions, meta } = useStructureEditor()
  const tower = meta.selectedTower
  const onlyUnit = floor.units.length <= 1
  const [confirming, setConfirming] = useState(false)
  const noun = floor.kind === 'garage' ? 'vaga' : 'unidade'

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

  function remove() {
    if (!tower || onlyUnit) {
      return
    }

    actions.updateTower(removeUnit(tower, floor.number, unit.key))
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações da unidade ${unit.code}`} />}
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={duplicate}>
            <CopyPlusIcon />
            Duplicar unidade
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={onlyUnit} onClick={() => setConfirming(true)}>
            <Trash2Icon />
            Remover unidade
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
