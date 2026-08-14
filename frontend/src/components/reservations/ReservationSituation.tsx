import { Progress } from '@/components/ui/progress'
import {
  reservationStepGreenClass,
  reservationStepProgress,
  reservationStepProgressFillClass,
} from '@/components/reservations/reservation-step-greens'
import { reservationStepIcon } from '@/components/reservations/reservation-step-icons'
import type {
  ReservationSituation as ReservationSituationData,
  ReservationSituationStep,
} from '@/lib/api'
import { cn } from '@/lib/utils'

type ChevronTone = 'past' | 'current' | 'upcoming' | 'failed'
type ChevronPosition = 'only' | 'first' | 'middle' | 'last'

type SituationSegment = {
  step: ReservationSituationStep
  tone: ChevronTone
}

type ReservationSituationProps = {
  situation: ReservationSituationData
  onOpenTimeline?: () => void
}

function formatDateTime(value: string | null, tone: ChevronTone): string {
  if (!value) {
    return tone === 'upcoming' ? 'Pendente' : '—'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function clipPath(position: ChevronPosition): string | undefined {
  if (position === 'only') {
    return undefined
  }

  if (position === 'first') {
    return 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
  }

  if (position === 'last') {
    return 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)'
  }

  return 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)'
}

function toneClass(tone: ChevronTone, stepKey: string): string {
  if (tone === 'failed') {
    return 'bg-destructive text-primary-foreground'
  }

  if (tone === 'upcoming') {
    return 'bg-muted text-muted-foreground'
  }

  return reservationStepGreenClass(stepKey)
}

function ChevronSegment({
  step,
  tone,
  position,
  index,
  total,
  onOpenTimeline,
}: {
  step: ReservationSituationStep
  tone: ChevronTone
  position: ChevronPosition
  index: number
  total: number
  onOpenTimeline?: () => void
}) {
  const Icon = reservationStepIcon(step.key)
  const path = clipPath(position)
  const isActive = tone === 'current' || tone === 'failed'
  const interactive = Boolean(isActive && onOpenTimeline)
  const emphasize = isActive && position === 'middle'
  const isSide = position === 'first' || position === 'last'

  const inner = (
    <>
      <span className="relative flex min-w-0 items-center gap-1 font-medium">
        <Icon aria-hidden className={isSide ? 'size-3 shrink-0' : 'size-3.5 shrink-0'} />
        <span className="truncate">{step.label}</span>
      </span>
      <span className={cn('relative truncate opacity-80', isSide ? 'text-[10px]' : 'text-[11px]')}>
        {formatDateTime(step.occurred_at, tone)}
      </span>
    </>
  )

  const bodyClassName = cn(
    'relative flex h-full w-full flex-col justify-center gap-0.5 py-1.5 text-left',
    isSide ? 'text-[11px]' : 'text-sm',
    position === 'first' || position === 'only' ? 'pl-3 pr-5' : 'pl-5 pr-5',
    position === 'last' || position === 'only' ? 'pr-3' : null,
    toneClass(tone, step.key),
    interactive ? 'cursor-pointer hover:brightness-110' : null,
    emphasize ? (tone === 'failed' ? 'situation-active-glow-failed' : 'situation-active-glow') : null,
  )

  return (
    <div
      className={cn(
        'relative min-w-0',
        emphasize ? 'z-20 min-w-44 flex-[2]' : 'min-w-24 flex-1 overflow-hidden',
        position !== 'first' && position !== 'only' ? '-ml-2.5' : null,
        position === 'first' || position === 'only' ? 'rounded-l-lg' : null,
        position === 'last' || position === 'only' ? 'rounded-r-lg' : null,
      )}
      style={{ zIndex: emphasize ? total + 1 : total - index }}
    >
      {interactive ? (
        <button
          type="button"
          className={bodyClassName}
          style={path ? { clipPath: path } : undefined}
          onClick={onOpenTimeline}
          aria-label={`Abrir andamento — ${step.label}`}
        >
          {inner}
        </button>
      ) : (
        <div className={bodyClassName} style={path ? { clipPath: path } : undefined}>
          {inner}
        </div>
      )}
    </div>
  )
}

function buildSegments(situation: ReservationSituationData): SituationSegment[] {
  const segments: SituationSegment[] = []

  if (situation.previous) {
    segments.push({ step: situation.previous, tone: 'past' })
  }

  segments.push({
    step: situation.current,
    tone: situation.current.status === 'failed' ? 'failed' : 'current',
  })

  if (situation.next) {
    segments.push({ step: situation.next, tone: 'upcoming' })
  }

  return segments
}

function segmentPosition(index: number, total: number): ChevronPosition {
  if (total === 1) {
    return 'only'
  }

  if (index === 0) {
    return 'first'
  }

  if (index === total - 1) {
    return 'last'
  }

  return 'middle'
}

export function ReservationSituation({ situation, onOpenTimeline }: ReservationSituationProps) {
  const segments = buildSegments(situation)
  const summary = segments.map((segment) => segment.step.label).join(' → ')
  const { current, total, percent } = reservationStepProgress(situation.current.key)
  const fillClass =
    situation.current.status === 'failed'
      ? '[&_[data-slot=progress-indicator]]:bg-destructive'
      : reservationStepProgressFillClass(situation.current.key)

  return (
    <div className="flex min-w-[28rem] flex-col gap-1.5">
      <div className="flex items-stretch gap-0" aria-label={`Situação: ${summary}`} title={summary}>
        {segments.map((segment, index) => (
          <ChevronSegment
            key={segment.step.key}
            step={segment.step}
            tone={segment.tone}
            position={segmentPosition(index, segments.length)}
            index={index}
            total={segments.length}
            onOpenTimeline={onOpenTimeline}
          />
        ))}
      </div>
      <Progress
        value={percent}
        className={cn('w-full gap-0', fillClass)}
        aria-label={`Progresso ${current} de ${total}`}
      />
    </div>
  )
}
