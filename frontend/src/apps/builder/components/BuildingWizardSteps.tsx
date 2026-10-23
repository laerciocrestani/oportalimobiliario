import { WIZARD_STEPS } from '@/apps/builder/lib/wizard-steps'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BuildingWizardStepsProps = {
  current: number
  maxReachable?: number
  onSelect?: (step: number) => void
}

export function BuildingWizardSteps({ current, maxReachable = current, onSelect }: BuildingWizardStepsProps) {
  return (
    <ol className="flex w-full items-center gap-5">
      {WIZARD_STEPS.map((step, index) => {
        const isCurrent = step.id === current
        const isDone = step.id < current
        const reachable = step.id <= maxReachable

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`${step.id}. ${step.label}`}
              disabled={!reachable}
              className="h-auto shrink-0 px-0"
              onClick={() => {
                if (reachable) {
                  onSelect?.(step.id)
                }
              }}
            >
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border text-[11px] font-semibold',
                  isCurrent && 'border-primary bg-primary text-primary-foreground',
                  !isCurrent && isDone && 'border-primary text-primary',
                  !isCurrent && !isDone && 'border-border text-muted-foreground',
                )}
              >
                {step.id}
              </span>
              <span className={cn('text-xs', isCurrent ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                {step.label}
              </span>
            </Button>
            {index < WIZARD_STEPS.length - 1 ? <span className="h-px min-w-4 flex-1 bg-border" /> : null}
          </li>
        )
      })}
    </ol>
  )
}
