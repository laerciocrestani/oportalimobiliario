import { RESERVATION_STEP_KEYS } from '@/components/reservations/reservation-step-icons'

export const RESERVATION_STEP_GREEN_CLASSES = [
  'bg-emerald-50 text-emerald-950',
  'bg-emerald-100 text-emerald-950',
  'bg-emerald-200 text-emerald-950',
  'bg-emerald-300 text-emerald-950',
  'bg-emerald-400 text-emerald-950',
  'bg-emerald-500 text-white',
  'bg-emerald-600 text-white',
  'bg-emerald-700 text-white',
  'bg-emerald-800 text-white',
  'bg-emerald-900 text-white',
  'bg-emerald-950 text-white',
  'bg-[oklch(18%_0.07_172.552)] text-white',
  'bg-[oklch(12%_0.08_172.552)] text-white',
] as const

export function reservationStepProgressIndex(stepKey: string): number {
  const index = (RESERVATION_STEP_KEYS as readonly string[]).indexOf(stepKey)

  if (index < 0) {
    return 0
  }

  return index
}

export function reservationStepGreenClass(stepKey: string): string {
  return RESERVATION_STEP_GREEN_CLASSES[reservationStepProgressIndex(stepKey)]
}

export function reservationStepGreenBgClass(stepKey: string): string {
  const bgClass = reservationStepGreenClass(stepKey)
    .split(/\s+/)
    .find((token) => token.startsWith('bg-'))

  return bgClass ?? 'bg-emerald-50'
}

export function reservationStepProgressFillClass(stepKey: string): string {
  return (
    [
      '[&_[data-slot=progress-indicator]]:bg-emerald-50',
      '[&_[data-slot=progress-indicator]]:bg-emerald-100',
      '[&_[data-slot=progress-indicator]]:bg-emerald-200',
      '[&_[data-slot=progress-indicator]]:bg-emerald-300',
      '[&_[data-slot=progress-indicator]]:bg-emerald-400',
      '[&_[data-slot=progress-indicator]]:bg-emerald-500',
      '[&_[data-slot=progress-indicator]]:bg-emerald-600',
      '[&_[data-slot=progress-indicator]]:bg-emerald-700',
      '[&_[data-slot=progress-indicator]]:bg-emerald-800',
      '[&_[data-slot=progress-indicator]]:bg-emerald-900',
      '[&_[data-slot=progress-indicator]]:bg-emerald-950',
      '[&_[data-slot=progress-indicator]]:bg-[oklch(18%_0.07_172.552)]',
      '[&_[data-slot=progress-indicator]]:bg-[oklch(12%_0.08_172.552)]',
    ] as const
  )[reservationStepProgressIndex(stepKey)]
}

export function reservationStepProgress(stepKey: string): {
  current: number
  total: number
  percent: number
} {
  const total = RESERVATION_STEP_KEYS.length
  const current = reservationStepProgressIndex(stepKey) + 1
  const percent = Math.round((current / total) * 100)

  return { current, total, percent }
}
