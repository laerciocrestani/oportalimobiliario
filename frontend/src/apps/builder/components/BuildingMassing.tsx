import { DEFAULT_TYPICAL_UNITS } from '@/apps/builder/lib/unit-grid'
import { cn } from '@/lib/utils'

export type MassingTower = {
  name: string
  floorsCount: number
  typicalCount?: number
}

type BuildingMassingProps = {
  towers: MassingTower[]
  selectedTowerIndex: number
  selectedFloor?: number | null
  onSelectTower: (index: number) => void
  onSelectFloor?: (towerIndex: number, floor: number) => void
}

const FINAL_COLORS = [
  '#7CB342',
  '#F5C542',
  '#5B9AEA',
  '#9B7ED9',
  '#F06292',
  '#26A69A',
  '#FF8A65',
  '#5C6BC0',
] as const

const CORE_COLOR = '#B0B8C1'
const ISO_TRANSFORM = 'rotateX(58deg) rotateZ(-45deg)'

function resolveTypicalCount(value: number | undefined): number {
  if (value == null || Number.isNaN(value) || value < 1) {
    return DEFAULT_TYPICAL_UNITS
  }

  return Math.min(20, Math.floor(value))
}

function finalColor(index: number): string {
  return FINAL_COLORS[index % FINAL_COLORS.length]
}

function finalLabel(index: number): string {
  return String(index + 1).padStart(2, '0')
}

function plateLayout(count: number): { cols: number; order: number[] } {
  if (count === 4) {
    return { cols: 2, order: [2, 3, 0, 1] }
  }

  if (count === 2) {
    return { cols: 2, order: [0, 1] }
  }

  const cols = count <= 3 ? count : Math.ceil(Math.sqrt(count))

  return {
    cols,
    order: Array.from({ length: count }, (_, index) => index),
  }
}

function unitAlignClass(visualIndex: number, cols: number, count: number): string {
  const row = Math.floor(visualIndex / cols)
  const col = visualIndex % cols
  const rows = Math.ceil(count / cols)
  const vertical = row === 0 ? 'items-start' : row === rows - 1 ? 'items-end' : 'items-center'
  const horizontal = col === 0 ? 'justify-start' : col === cols - 1 ? 'justify-end' : 'justify-center'

  return `${vertical} ${horizontal}`
}

function slabMetrics(maxFloors: number): { size: number; pitch: number; thickness: number } {
  const maxStack = 420
  const size = Math.max(32, Math.min(88, Math.floor((maxStack - (maxFloors - 1) * 10) / maxFloors)))
  const thickness = Math.max(3, Math.round(size / 12)) + 5
  const pitch = thickness + Math.max(4, Math.round(size * 0.16))

  return { size, pitch, thickness }
}

function FloorPlate({
  typicalCount,
  showLabels,
}: {
  typicalCount: number
  showLabels: boolean
}) {
  const { cols, order } = plateLayout(typicalCount)
  const showCore = typicalCount >= 3

  return (
    <div className="relative size-full bg-white/70">
      <div
        className="grid size-full gap-px p-px"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {order.map((unitIndex, visualIndex) => (
          <div
            key={unitIndex}
            className={cn('flex p-0.5', unitAlignClass(visualIndex, cols, typicalCount))}
            style={{ backgroundColor: finalColor(unitIndex) }}
          >
            {showLabels ? (
              <span className="text-[9px] font-bold leading-none text-white drop-shadow-sm">
                {finalLabel(unitIndex)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {showCore ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[28%] rounded-[2px] shadow-inner"
          style={{ backgroundColor: CORE_COLOR }}
        />
      ) : null}
    </div>
  )
}

function FloorSlab({
  size,
  thickness,
  typicalCount,
  showLabels,
  selected,
  label,
  pressed,
  onClick,
}: {
  size: number
  thickness: number
  typicalCount: number
  showLabels: boolean
  selected: boolean
  label: string
  pressed: boolean
  onClick: () => void
}) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: size,
        height: size,
        transform: ISO_TRANSFORM,
        transformStyle: 'preserve-3d',
        filter: selected
          ? 'drop-shadow(0 8px 6px rgb(15 23 42 / 0.22))'
          : 'drop-shadow(0 4px 3px rgb(15 23 42 / 0.14))',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 rounded-[2px] bg-zinc-600/70"
        style={{ transform: 'translateZ(0)' }}
      />
      <div
        aria-hidden
        className="absolute top-0 left-0 origin-top bg-zinc-700/70"
        style={{
          width: size,
          height: thickness,
          transform: 'rotateX(-90deg)',
        }}
      />
      <div
        aria-hidden
        className="absolute top-0 right-0 origin-right bg-zinc-800/65"
        style={{
          width: thickness,
          height: size,
          transform: 'rotateY(90deg)',
        }}
      />
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        className={cn(
          'absolute inset-0 overflow-hidden rounded-[2px] border border-white/60 transition-[box-shadow,transform]',
          selected && 'ring-2 ring-ring ring-offset-1 ring-offset-transparent',
        )}
        style={{ transform: `translateZ(${thickness}px)` }}
        onClick={onClick}
      >
        <FloorPlate typicalCount={typicalCount} showLabels={showLabels} />
      </button>
    </div>
  )
}

function MassingLegend({ typicalCount }: { typicalCount: number }) {
  const items = Array.from({ length: typicalCount }, (_, index) => index)
  const showCore = typicalCount >= 3

  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
      {items.map((index) => (
        <li key={index} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: finalColor(index) }} />
          Final {finalLabel(index)}
        </li>
      ))}
      {showCore ? (
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: CORE_COLOR }} />
          Áreas comuns
        </li>
      ) : null}
    </ul>
  )
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

function MassingTowerColumn({
  tower,
  towerIndex,
  selected,
  selectedFloor,
  size,
  pitch,
  thickness,
  onSelectTower,
  onSelectFloor,
}: {
  tower: MassingTower
  towerIndex: number
  selected: boolean
  selectedFloor: number | null
  size: number
  pitch: number
  thickness: number
  onSelectTower: (index: number) => void
  onSelectFloor?: (towerIndex: number, floor: number) => void
}) {
  const floorsCount = Math.max(1, tower.floorsCount)
  const typicalCount = resolveTypicalCount(tower.typicalCount)
  const floors = Array.from({ length: floorsCount }, (_, index) => index + 1)
  const showLabelsOnAll = size >= 56 && floorsCount <= 10 && typicalCount <= 8
  const name = tower.name || `Torre ${towerIndex + 1}`
  const overflowPad = Math.round(size * 0.38)

  return (
    <div
      className={cn(
        'flex min-w-28 flex-col items-center gap-3 transition-opacity',
        selected ? 'opacity-100' : 'opacity-55 hover:opacity-80',
      )}
    >
      <div
        className="flex flex-col-reverse items-center"
        style={{ paddingTop: overflowPad, paddingBottom: overflowPad }}
      >
        {floors.map((floor) => {
          const floorSelected = selected && selectedFloor === floor

          return (
            <div key={floor} className="relative" style={{ width: size, height: pitch }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <FloorSlab
                  size={size}
                  thickness={thickness}
                  typicalCount={typicalCount}
                  showLabels={showLabelsOnAll || floorSelected}
                  selected={floorSelected}
                  label={`${name}, andar ${floor}`}
                  pressed={selected && (selectedFloor == null || selectedFloor === floor)}
                  onClick={() => {
                    onSelectTower(towerIndex)
                    onSelectFloor?.(towerIndex, floor)
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div
        aria-hidden
        className="h-2 rounded-full bg-foreground/15"
        style={{ width: size * 1.35 }}
      />
      <p className={cn('max-w-28 truncate text-center text-xs', selected && 'font-medium text-primary')}>
        {name}
      </p>
    </div>
  )
}

export function BuildingMassing({
  towers,
  selectedTowerIndex,
  selectedFloor = null,
  onSelectTower,
  onSelectFloor,
}: BuildingMassingProps) {
  const maxFloors = Math.max(1, ...towers.map((tower) => tower.floorsCount))
  const { size, pitch, thickness } = slabMetrics(maxFloors)
  const selectedTower = towers[Math.min(selectedTowerIndex, Math.max(0, towers.length - 1))]
  const selectedTypical = resolveTypicalCount(selectedTower?.typicalCount)
  const selectedFloors = Math.max(1, selectedTower?.floorsCount ?? 1)

  return (
    <div data-testid="building-massing" className="rounded-xl bg-muted/40 p-5">
      <div className="flex max-h-[28rem] items-end justify-center gap-10 overflow-x-auto overflow-y-auto px-10 pt-6 pb-2">
        {towers.map((tower, towerIndex) => (
          <MassingTowerColumn
            key={`${tower.name}-${towerIndex}`}
            tower={tower}
            towerIndex={towerIndex}
            selected={towerIndex === selectedTowerIndex}
            selectedFloor={selectedFloor}
            size={size}
            pitch={pitch}
            thickness={thickness}
            onSelectTower={onSelectTower}
            onSelectFloor={onSelectFloor}
          />
        ))}
      </div>
      {selectedTower ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-3">
          <MassingLegend typicalCount={selectedTypical} />
          <p className="text-center text-[11px] text-muted-foreground">
            {plural(selectedFloors, 'andar', 'andares')}
            {' · '}
            {plural(selectedTypical, 'unidade por andar', 'unidades por andar')}
            {' · '}
            {plural(selectedFloors * selectedTypical, 'unidade no total', 'unidades no total')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
