import { useEffect, useState } from 'react'
import { ClockIcon } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  formatHoldDeadline,
  formatHoldRemaining,
  holdProgressTone,
  holdRemainingMs,
  holdRemainingPercent,
  type HoldProgressTone,
} from '@/components/reservations/reservation-hold-countdown'

const HOLD_PROGRESS_TONE_CLASS: Record<
  HoldProgressTone,
  { indicator: string; remaining: string }
> = {
  healthy: {
    indicator: '[&_[data-slot=progress-indicator]]:bg-zinc-500',
    remaining: 'text-muted-foreground',
  },
  warning: {
    indicator: '[&_[data-slot=progress-indicator]]:bg-amber-500',
    remaining: 'text-amber-700 dark:text-amber-400',
  },
  critical: {
    indicator: '[&_[data-slot=progress-indicator]]:bg-destructive',
    remaining: 'text-destructive',
  },
}

type ReservationHoldCountdownProps = {
  createdAt: string
  expiresAt: string
}

function useNow(expiresAt: string): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    setNow(Date.now())

    if (Date.parse(expiresAt) <= Date.now()) {
      return
    }

    const id = window.setInterval(() => {
      const next = Date.now()
      setNow(next)

      if (Date.parse(expiresAt) <= next) {
        window.clearInterval(id)
      }
    }, 1000)

    return () => window.clearInterval(id)
  }, [expiresAt])

  return now
}

export function ReservationHoldCountdown({ createdAt, expiresAt }: ReservationHoldCountdownProps) {
  const now = useNow(expiresAt)
  const remainingMs = holdRemainingMs(expiresAt, now)
  const percent = holdRemainingPercent(createdAt, expiresAt, now)
  const tone = holdProgressTone(percent)
  const remainingLabel = formatHoldRemaining(expiresAt, now)
  const deadlineLabel = formatHoldDeadline(expiresAt)
  const expired = remainingMs <= 0
  const remainingText = expired ? 'prazo encerrado' : remainingLabel
  const countdownLabel = `até ${deadlineLabel}, resta ${remainingText}`

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span
          className={cn(
            'flex min-w-0 items-center gap-1 font-medium tabular-nums',
            HOLD_PROGRESS_TONE_CLASS[tone].remaining,
          )}
        >
          <ClockIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{remainingText}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground">até {deadlineLabel}</span>
      </div>
      <Progress
        value={percent}
        className={cn('w-full gap-0', HOLD_PROGRESS_TONE_CLASS[tone].indicator)}
        aria-label={`Prazo da pré-reserva: ${countdownLabel}`}
      />
    </div>
  )
}
