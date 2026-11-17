import { ClipboardListIcon, FileTextIcon, ImageIcon, LayersIcon, type LucideIcon } from 'lucide-react'
import { WIZARD_STEPS, type WizardStepId } from '@/apps/builder/lib/wizard-steps'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEP_ICONS: Record<WizardStepId, LucideIcon> = {
  1: FileTextIcon,
  2: LayersIcon,
  3: ClipboardListIcon,
  4: ImageIcon,
}

type BuildingWizardStepsProps = {
  current: number
  maxReachable?: number
  onSelect?: (step: number) => void
}

export function BuildingWizardSteps({ current, maxReachable = current, onSelect }: BuildingWizardStepsProps) {
  return (
    <ol className="flex w-full min-w-0 items-center gap-3">
      {WIZARD_STEPS.map((step, index) => {
        const isCurrent = step.id === current
        const isDone = step.id < current
        const reachable = step.id <= maxReachable
        const Icon = STEP_ICONS[step.id]

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              aria-label={`${step.id}. ${step.label}`}
              disabled={!reachable}
              className="h-auto min-w-0 justify-start px-1"
              onClick={() => {
                if (reachable) {
                  onSelect?.(step.id)
                }
              }}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  isCurrent && 'bg-primary text-primary-foreground',
                  !isCurrent && isDone && 'bg-primary/15 text-primary',
                  !isCurrent && !isDone && 'bg-muted text-muted-foreground',
                )}
              >
                <Icon />
              </span>
              <span className="flex min-w-0 flex-col items-start">
                <span className={cn('truncate text-sm', isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {step.label}
                </span>
                <span className="truncate text-xs text-muted-foreground">{step.description}</span>
              </span>
            </Button>
            {index < WIZARD_STEPS.length - 1 ? <span className="h-px min-w-4 flex-1 bg-border" /> : null}
          </li>
        )
      })}
    </ol>
  )
}
