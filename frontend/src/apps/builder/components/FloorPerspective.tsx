import { useId } from 'react'
import { floorLabel, type StackFloor } from '@/apps/builder/lib/floor-stack'
import type { FloorKind } from '@/lib/api'
import { cn } from '@/lib/utils'

const X = 10
const FRONT = 128
const DEPTH = 46
const SKEW = 18
const VIEW_W = X + FRONT + DEPTH + 14

type FloorPerspectiveProps = {
  floors: Array<Pick<StackFloor, 'number' | 'kind'>>
  selectedNumber?: number | null
  onSelect?: (number: number) => void
  className?: string
}

type StoryKind = 'glass' | 'lobby' | 'garage'

export function layersBottomToTop<T extends { number: number }>(floors: T[]): T[] {
  return [...floors].toSorted((left, right) => left.number - right.number)
}

function storyKind(kind: FloorKind, number: number): StoryKind {
  if (kind === 'garage') {
    return 'garage'
  }

  if (kind === 'hall' || number === 0) {
    return 'lobby'
  }

  return 'glass'
}

function storyHeight(kind: StoryKind): number {
  if (kind === 'garage') {
    return 62
  }

  if (kind === 'lobby') {
    return 78
  }

  return 56
}

function floorBadge(number: number): string {
  return String(number)
}

function NumberBadge({
  cx,
  cy,
  label,
  selected,
}: {
  cx: number
  cy: number
  label: string
  selected: boolean
}) {
  const rx = Math.max(13, 8 + label.length * 4)

  return (
    <g>
      <ellipse cx={cx} cy={cy + 1} rx={rx} ry={11} fill="#18181b" opacity="0.14" />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={11}
        fill="#ffffff"
        stroke={selected ? '#18181b' : '#e7e5e4'}
        strokeWidth={selected ? 1.8 : 0.7}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="700"
        fill="#18181b"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  )
}

function Slab({ isTop, roofId }: { isTop: boolean; roofId: string }) {
  const right = X + FRONT

  return (
    <g>
      <path
        d={`M ${X - 2} 0 L ${right + 2} 0 L ${right + DEPTH} ${-SKEW} L ${X + DEPTH - 4} ${-SKEW} Z`}
        fill={isTop ? '#f8fafc' : '#e4e4e7'}
        stroke="#cbd5e1"
        strokeWidth="0.7"
      />
      <path
        d={`M ${right + 2} 0 L ${right + DEPTH} ${-SKEW} L ${right + DEPTH} ${6 - SKEW} L ${right + 2} 6 Z`}
        fill="#cbd5e1"
      />
      <rect x={X - 2} y={0} width={FRONT + 4} height={6} fill="#f8fafc" stroke="#d4d4d8" strokeWidth="0.5" />
      {isTop ? (
        <rect
          x={X + 48}
          y={-SKEW + 3}
          width={36}
          height={12}
          rx="1.5"
          fill={`url(#${roofId})`}
          stroke="#94a3b8"
          strokeWidth="0.6"
        />
      ) : null}
    </g>
  )
}

function GlassFace({ x, y, width, height, glassId }: { x: number; y: number; width: number; height: number; glassId: string }) {
  const cols = 4
  const gap = 2.5
  const paneW = (width - gap * (cols + 1)) / cols
  const paneH = (height - gap * 3) / 2

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#10243b" />
      <rect x={x + 10} y={y + 8} width={18} height={3} rx="1" fill="#fef3c7" opacity="0.9" />
      <rect x={x + width * 0.36} y={y + 7} width={22} height={3} rx="1" fill="#fef3c7" opacity="0.8" />
      <rect x={x + width * 0.62} y={y + 9} width={16} height={3} rx="1" fill="#fef3c7" opacity="0.75" />
      <rect x={x + 8} y={y + height - 16} width={28} height={8} rx="1" fill="#1e293b" />
      <rect x={x + width * 0.38} y={y + height - 18} width={34} height={10} rx="1.5" fill="#cbd5e1" opacity="0.85" />
      <rect x={x + width * 0.7} y={y + height - 14} width={22} height={7} rx="1" fill="#1e293b" />
      {Array.from({ length: cols }, (_, column) =>
        [0, 1].map((row) => (
          <rect
            key={`${column}-${row}`}
            x={x + gap + column * (paneW + gap)}
            y={y + gap + row * (paneH + gap)}
            width={paneW}
            height={paneH}
            fill={`url(#${glassId})`}
            opacity="0.38"
          />
        )),
      )}
    </g>
  )
}

function LobbyFace({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const innerX = x + 12
  const innerW = width - 24

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#d6d3d1" />
      <rect x={x} y={y} width={10} height={height} fill="#c4bfb8" />
      <rect x={x + width - 10} y={y} width={10} height={height} fill="#b7b2ab" />
      <rect x={innerX} y={y + 4} width={innerW} height={height - 8} fill="#f6efe6" />
      <rect x={innerX + 6} y={y + 8} width={14} height={10} rx="0.5" fill="#7dd3fc" />
      <rect x={innerX + 8} y={y + height - 28} width={2} height={12} fill="#78716c" />
      <circle cx={innerX + 9} cy={y + height - 30} r={6} fill="#4ade80" />
      <rect x={innerX + innerW * 0.34} y={y + height - 26} width={innerW * 0.34} height={12} rx="3" fill="#e7e5e4" />
      <rect x={innerX + innerW * 0.38} y={y + height - 32} width={innerW * 0.26} height={8} rx="2" fill="#f5f5f4" />
      <rect x={innerX + innerW * 0.46} y={y + height - 18} width={16} height={5} rx="1" fill="#a8a29e" />
      {[0, 1, 2, 3].map((column) => (
        <line
          key={column}
          x1={innerX + (innerW / 4) * column}
          x2={innerX + (innerW / 4) * column}
          y1={y + 4}
          y2={y + height - 4}
          stroke="#94a3b8"
          strokeWidth="1"
          opacity="0.55"
        />
      ))}
    </g>
  )
}

function Car({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y + 5} width={30} height={9} rx="2" fill="#27272a" />
      <path d={`M ${x + 7} ${y + 5} L ${x + 11} ${y} H ${x + 20} L ${x + 24} ${y + 5} Z`} fill="#3f3f46" />
      <circle cx={x + 7} cy={y + 14} r="2.3" fill="#18181b" />
      <circle cx={x + 23} cy={y + 14} r="2.3" fill="#18181b" />
    </g>
  )
}

function GarageFace({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const bayW = (width - 22) / 2

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#d6d3d1" />
      <rect x={x + 6} y={y + 6} width={bayW} height={height - 8} fill="#3f3f46" />
      <rect x={x + width - 6 - bayW} y={y + 6} width={bayW} height={height - 8} fill="#3f3f46" />
      <rect x={x + width / 2 - 4} y={y} width={8} height={height} fill="#c8c3bc" />
      <Car x={x + 12} y={y + height - 24} />
      <Car x={x + width / 2 + 8} y={y + height - 24} />
    </g>
  )
}

function FloorStory({
  kind,
  number,
  y,
  height,
  isTop,
  selected,
  onSelect,
  glassId,
  roofId,
}: {
  kind: StoryKind
  number: number
  y: number
  height: number
  isTop: boolean
  selected: boolean
  onSelect?: (number: number) => void
  glassId: string
  roofId: string
}) {
  const interactive = onSelect != null
  const right = X + FRONT
  const sideFill = kind === 'glass' ? '#1e3a5f' : '#b7b2ab'

  return (
    <g
      transform={`translate(0 ${y})`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? floorLabel(number) : undefined}
      aria-pressed={interactive ? selected : undefined}
      className={interactive ? 'cursor-pointer' : undefined}
      onClick={interactive ? () => onSelect(number) : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(number)
              }
            }
          : undefined
      }
    >
      <path
        d={`M ${right} 6 L ${right + DEPTH} ${6 - SKEW} L ${right + DEPTH} ${height - SKEW} L ${right} ${height} Z`}
        fill={sideFill}
        stroke="#94a3b8"
        strokeWidth="0.6"
      />
      {kind === 'glass'
        ? [0.28, 0.55, 0.8].map((stop) => (
            <line
              key={stop}
              x1={right + DEPTH * stop}
              x2={right + DEPTH * stop}
              y1={8 - SKEW * (1 - stop)}
              y2={height - 4 - SKEW * (1 - stop)}
              stroke="#7dd3fc"
              strokeWidth="4"
              opacity="0.35"
            />
          ))
        : null}
      <Slab isTop={isTop} roofId={roofId} />
      {kind === 'glass' ? <GlassFace x={X} y={6} width={FRONT} height={height - 6} glassId={glassId} /> : null}
      {kind === 'lobby' ? <LobbyFace x={X} y={6} width={FRONT} height={height - 6} /> : null}
      {kind === 'garage' ? <GarageFace x={X} y={6} width={FRONT} height={height - 6} /> : null}
      {selected ? (
        <rect x={X - 1.5} y={4} width={FRONT + 3} height={height - 4} fill="none" stroke="#18181b" strokeWidth="1.6" />
      ) : null}
      <NumberBadge cx={X + FRONT / 2} cy={6 + (height - 6) * 0.46} label={floorBadge(number)} selected={selected} />
    </g>
  )
}

export function FloorPerspective({ floors, selectedNumber = null, onSelect, className }: FloorPerspectiveProps) {
  const rawId = useId().replace(/:/g, '')
  const glassId = `floor-glass-${rawId}`
  const roofId = `floor-roof-${rawId}`
  const bottomToTop = layersBottomToTop(floors)
  const stories = [...bottomToTop].reverse().map((floor) => {
    const kind = storyKind(floor.kind, floor.number)

    return { floor, kind, height: storyHeight(kind) }
  })

  let cursor = SKEW + 6
  const placed = stories.map((story, index) => {
    const y = cursor
    cursor += story.height

    return { ...story, y, isTop: index === 0 }
  })
  const stackHeight = cursor + 8

  return (
    <div className={cn('flex justify-center overflow-hidden rounded-md bg-muted px-3 py-4', className)}>
        <svg viewBox={`0 0 ${VIEW_W} ${stackHeight}`} className="h-auto w-full" aria-hidden={onSelect == null}>
        <defs>
          <linearGradient id={glassId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0f2fe" />
            <stop offset="0.45" stopColor="#7dd3fc" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id={roofId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0f2fe" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <ellipse cx={X + FRONT / 2 + 8} cy={stackHeight - 4} rx={FRONT / 2 + 6} ry="3.5" fill="#18181b" opacity="0.08" />
        {[...placed].reverse().map((story) => (
          <FloorStory
            key={story.floor.number}
            kind={story.kind}
            number={story.floor.number}
            y={story.y}
            height={story.height}
            isTop={story.isTop}
            selected={selectedNumber === story.floor.number}
            onSelect={onSelect}
            glassId={glassId}
            roofId={roofId}
          />
        ))}
      </svg>
    </div>
  )
}
