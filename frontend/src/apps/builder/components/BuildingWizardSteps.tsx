import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'Identidade' },
  { id: 2, label: 'Torres' },
  { id: 3, label: 'Unidades' },
  { id: 4, label: 'Mídia' },
] as const

type BuildingWizardStepsProps = {
  current: number
  maxReachable?: number
  onSelect?: (step: number) => void
}

export function BuildingWizardSteps({ current, maxReachable = current, onSelect }: BuildingWizardStepsProps) {
  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((step) => {
        const isCurrent = step.id === current
        const isDone = step.id < current
        const reachable = step.id <= maxReachable

        return (
          <li key={step.id}>
            <Button
              type="button"
              variant={isCurrent ? 'default' : 'outline'}
              size="sm"
              disabled={!reachable}
              className={cn(isDone && !isCurrent && 'opacity-70')}
              onClick={() => {
                if (reachable) {
                  onSelect?.(step.id)
                }
              }}
            >
              {step.id}. {step.label}
            </Button>
          </li>
        )
      })}
    </ol>
  )
}
