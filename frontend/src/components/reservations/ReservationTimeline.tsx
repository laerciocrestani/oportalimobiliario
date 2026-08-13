import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ReservationTimeline, ReservationTimelineStepStatus } from '@/lib/api'
import { cn } from '@/lib/utils'
import { CheckIcon, CircleIcon, ClockIcon, XIcon } from 'lucide-react'

const STATUS_LABELS: Record<ReservationTimelineStepStatus, string> = {
  completed: 'Concluído',
  current: 'Em andamento',
  upcoming: 'Pendente',
  skipped: 'Ignorado',
  failed: 'Falhou',
}

const ACTION_LABELS: Record<string, string> = {
  open_dialogue: 'Abrir diálogo',
  submit_proposal: 'Enviar proposta',
  submit_deposit_proof: 'Anexar comprovante',
  approve_deposit_proof: 'Validar comprovante',
  submit_contract_data: 'Enviar dados do contrato',
  issue_contract: 'Emitir contrato',
  upload_signed_contract: 'Enviar contrato assinado',
  validate_contract: 'Validar e concluir venda',
}

function formatDateTime(value: string | null): string | null {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function StepIcon({ status }: { status: ReservationTimelineStepStatus }) {
  if (status === 'completed') {
    return <CheckIcon className="size-4 text-primary" />
  }

  if (status === 'current') {
    return <ClockIcon className="size-4 text-primary" />
  }

  if (status === 'failed') {
    return <XIcon className="size-4 text-destructive" />
  }

  return <CircleIcon className="size-4 text-muted-foreground" />
}

type ReservationTimelineProps = {
  timeline: ReservationTimeline
  onAction?: (action: string) => void
}

export function ReservationTimeline({ timeline, onAction }: ReservationTimelineProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-3 text-sm">
        <p>
          <span className="text-muted-foreground">Unidade:</span>{' '}
          <span className="font-medium">{timeline.unit.code}</span>
        </p>
        {timeline.expires_at ? (
          <p className="mt-1 text-muted-foreground">
            Prazo: {formatDateTime(timeline.expires_at)}
          </p>
        ) : null}
        {timeline.deposit_overdue ? (
          <p className="mt-1 text-sm text-destructive">
            Prazo de sinal vencido — envie o comprovante o quanto antes.
          </p>
        ) : null}
      </div>

      <ol className="space-y-0">
        {timeline.steps.map((step, index) => {
          const isLast = index === timeline.steps.length - 1

          return (
            <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-6 left-[11px] h-[calc(100%-12px)] w-px',
                    step.status === 'completed' ? 'bg-primary/40' : 'bg-border',
                  )}
                />
              ) : null}

              <div className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                <StepIcon status={step.status} />
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{step.label}</p>
                  <Badge variant={step.status === 'current' ? 'default' : 'secondary'}>
                    {STATUS_LABELS[step.status]}
                  </Badge>
                </div>

                {step.occurred_at ? (
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(step.occurred_at)}
                    {step.actor ? ` · ${step.actor.name}` : ''}
                  </p>
                ) : null}

                {step.status === 'current' && step.due_at ? (
                  <p className="text-xs text-muted-foreground">
                    Vence em {formatDateTime(step.due_at)}
                  </p>
                ) : null}

                {step.status === 'current' && step.actions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {step.actions.map((action) => (
                      <Button
                        key={action}
                        type="button"
                        size="sm"
                        variant={action === 'open_dialogue' ? 'outline' : 'default'}
                        onClick={() => onAction?.(action)}
                      >
                        {ACTION_LABELS[action] ?? action}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
