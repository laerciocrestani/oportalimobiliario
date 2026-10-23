import { floorLabel, type StackFloor } from '@/apps/builder/lib/floor-stack'
import type { FloorKind } from '@/lib/api'
import { cn } from '@/lib/utils'

const LAYER_STEP = 18

const LAYER_COLOR: Record<FloorKind, { top: string; front: string; side: string; stroke: string }> = {
  garage: { top: '#E4E4E7', front: '#A1A1AA', side: '#71717A', stroke: '#52525B' },
  hall: { top: '#FDE68A', front: '#FBBF24', side: '#D97706', stroke: '#B45309' },
  residential: { top: '#DBEAFE', front: '#93C5FD', side: '#3B82F6', stroke: '#1D4ED8' },
  commercial: { top: '#D1FAE5', front: '#6EE7B7', side: '#10B981', stroke: '#047857' },
}

type FloorPerspectiveProps = {
  floors: Array<Pick<StackFloor, 'number' | 'kind'>>
  className?: string
}

export function layersBottomToTop<T extends { number: number }>(floors: T[]): T[] {
  return [...floors].toSorted((left, right) => left.number - right.number)
}

function FloorPlate({ kind, index }: { kind: FloorKind; index: number }) {
  const color = LAYER_COLOR[kind]
  const y = index * LAYER_STEP

  return (
    <g transform={`translate(0 ${y})`}>
      <path d="M108 38 L148 16 L148 26 L108 48 Z" fill={color.side} stroke={color.stroke} strokeWidth="0.8" />
      <path d="M4 20 L108 38 L108 48 L4 30 Z" fill={color.front} stroke={color.stroke} strokeWidth="0.8" />
      <path d="M4 20 L108 38 L148 16 L44 0 Z" fill={color.top} stroke={color.stroke} strokeWidth="0.8" />
      {kind === 'residential' || kind === 'commercial' ? (
        <path d="M28 16 L62 24 L78 16 L44 8 Z" fill={color.front} opacity="0.85" />
      ) : null}
    </g>
  )
}

export function FloorPerspective({ floors, className }: FloorPerspectiveProps) {
  const bottomToTop = layersBottomToTop(floors)
  const topToBottom = [...bottomToTop].reverse()
  const stackHeight = 52 + Math.max(bottomToTop.length - 1, 0) * LAYER_STEP

  return (
    <div className={cn('flex items-center gap-6 overflow-hidden rounded-md bg-muted px-4 py-3', className)}>
      <svg
        viewBox={`0 0 160 ${stackHeight}`}
        className="h-auto w-40 shrink-0"
        role="img"
        aria-label="Perspectiva dos pavimentos"
      >
        <g transform={`translate(4 ${stackHeight - 52 - (bottomToTop.length - 1) * LAYER_STEP})`}>
          {bottomToTop.map((floor, index) => (
            <FloorPlate key={floor.number} kind={floor.kind} index={bottomToTop.length - 1 - index} />
          ))}
        </g>
      </svg>
      {topToBottom.length > 0 ? (
        <ul className="flex max-h-40 min-w-0 flex-col gap-1.5 overflow-y-auto">
          {topToBottom.map((floor) => (
            <li key={floor.number} className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: LAYER_COLOR[floor.kind].front }}
              />
              <span className="truncate text-xs text-muted-foreground">
                {floorLabel(floor.number)} · {kindCaption(floor.kind)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function kindCaption(kind: FloorKind): string {
  if (kind === 'garage') {
    return 'Garagem'
  }

  if (kind === 'hall') {
    return 'Hall'
  }

  if (kind === 'commercial') {
    return 'Comercial'
  }

  return 'Residencial'
}
