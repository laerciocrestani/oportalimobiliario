import { useState } from 'react'
import {
  Building2Icon,
  CheckIcon,
  DoorOpenIcon,
  EllipsisIcon,
  ListFilterIcon,
  StoreIcon,
  WarehouseIcon,
  type LucideIcon,
} from 'lucide-react'
import { addFloor, floorKindLabel, floorsTopToBottom, type StackFloor } from '@/apps/builder/lib/floor-stack'
import { unitStatusLabels, type UnitStatus } from '@/apps/builder/lib/unit-status'
import { useStructureEditor } from '@/apps/builder/components/structure-editor-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import type { FloorKind } from '@/lib/api'
import { cn } from '@/lib/utils'

type FloorFilter = 'all' | FloorKind

const FILTERS: { value: FloorFilter; label: string }[] = [
  { value: 'all', label: 'Todos os pavimentos' },
  { value: 'residential', label: 'Residencial' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'hall', label: 'Hall' },
  { value: 'garage', label: 'Garagem' },
]

function pavementTitle(number: number): string {
  if (number > 0) {
    return `${number}º pavimento`
  }

  if (number === 0) {
    return 'Térreo'
  }

  return `Subsolo ${Math.abs(number)}`
}

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
  const floors = tower ? floorsTopToBottom(tower.floors) : []
  const visibleFloors = filter === 'all' ? floors : floors.filter((item) => item.kind === filter)

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
          <p className="text-sm text-muted-foreground">Selecione um pavimento para ver os detalhes e unidades.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
              <EllipsisIcon data-icon="inline-start" />
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
                  selected={floor?.number === item.number}
                  share={floorOccupancy(item).percent}
                  onSelect={() => actions.selectFloor(item.number)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="md:sticky md:top-4">
          <CardHeader>
            <CardDescription className="tracking-wide uppercase">Pavimento selecionado</CardDescription>
            <CardAction>
              <Badge>{floor ? floor.number : '—'}</Badge>
            </CardAction>
            <p className="text-xl font-semibold">{floor ? pavementTitle(floor.number) : 'Pavimento'}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {floor ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <FloorStat label="Unidades" value={floor.units.length} />
                  <FloorStat label="Ocupadas" value={floorOccupancy(floor).occupied} />
                  <FloorStat label="Disponíveis" value={floorOccupancy(floor).available} />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>Taxa de ocupação</span>
                    <span className="text-muted-foreground tabular-nums">{floorOccupancy(floor).percent}%</span>
                  </div>
                  <Progress value={floorOccupancy(floor).percent} />
                  <p className="text-xs text-muted-foreground">
                    {floorKindLabel(floor.kind)} · {floor.units.length} {unitNoun(floor.kind, floor.units.length)}
                    {floor.customized ? ' · exceção' : ''}
                    {tower?.referenceFloor === floor.number ? ' · pavimento-modelo' : ''}
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Unidades neste pavimento</p>
                </div>
                {floor.units.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {floor.kind === 'hall' ? 'Hall não tem unidades privadas.' : 'Nenhuma unidade neste pavimento.'}
                  </p>
                ) : (
                  <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                    {floor.units.map((unit) => (
                      <div key={unit.key} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                        <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Building2Icon />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">Unidade {unit.code}</span>
                        <Badge variant={isTaken(unit.status) ? 'default' : 'secondary'}>{statusLabel(unit.status)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="link"
                  className="self-start px-0"
                  onClick={() => document.getElementById('structure-floor-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  Editar unidades
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione um pavimento no mapa.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FloorStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function FloorRow({
  floor,
  selected,
  share,
  onSelect,
}: {
  floor: StackFloor
  selected: boolean
  share: number
  onSelect: () => void
}) {
  const Icon = floorIcon(floor.kind)

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left',
        selected ? 'bg-accent' : 'hover:bg-muted',
      )}
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
          <span className="truncate text-sm font-medium">{pavementTitle(floor.number)}</span>
          <span className="shrink-0 text-sm text-muted-foreground">
            {floor.units.length} {unitNoun(floor.kind, floor.units.length)}
          </span>
        </span>
        <Progress value={share} />
      </span>
      {selected ? <CheckIcon className="size-4 shrink-0 text-primary" /> : <span className="size-4 shrink-0" />}
    </button>
  )
}
