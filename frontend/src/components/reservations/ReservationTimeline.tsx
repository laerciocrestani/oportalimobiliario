import { Button } from '@/components/ui/button'
import { ReservationAttachmentPreview } from '@/components/reservations/ReservationAttachmentPreview'
import {
  reservationStepGreenBgClass,
  reservationStepGreenClass,
} from '@/components/reservations/reservation-step-greens'
import { reservationStepIcon } from '@/components/reservations/reservation-step-icons'
import type {
  ReservationAttachment,
  ReservationTimeline,
  ReservationTimelineStepStatus,
} from '@/lib/api'
import { cn } from '@/lib/utils'

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

const ATTACHMENT_KIND_LABELS: Record<string, string> = {
  deposit_proof: 'Comprovante de pagamento',
  contract_documentation: 'Documentação do cliente',
  contract_pdf: 'Contrato',
  contract_signed: 'Contrato assinado',
}

const ATTACHMENT_KIND_ORDER = [
  'deposit_proof',
  'contract_documentation',
  'contract_pdf',
  'contract_signed',
] as const

function formatDateTime(value: string | null): string | null {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function groupedAttachments(attachments: ReservationAttachment[]): Array<{
  kind: string
  label: string
  items: ReservationAttachment[]
}> {
  const byKind = new Map<string, ReservationAttachment[]>()

  for (const attachment of attachments) {
    const items = byKind.get(attachment.kind) ?? []
    items.push(attachment)
    byKind.set(attachment.kind, items)
  }

  const orderedKinds = [
    ...ATTACHMENT_KIND_ORDER.filter((kind) => byKind.has(kind)),
    ...[...byKind.keys()].filter((kind) => !ATTACHMENT_KIND_ORDER.includes(kind as (typeof ATTACHMENT_KIND_ORDER)[number])),
  ]

  return orderedKinds.map((kind) => ({
    kind,
    label: ATTACHMENT_KIND_LABELS[kind] ?? kind,
    items: byKind.get(kind) ?? [],
  }))
}

function StepIcon({ stepKey }: { stepKey: string }) {
  const Icon = reservationStepIcon(stepKey)

  return <Icon aria-hidden className="size-4" />
}

function StepMarker({
  stepKey,
  status,
}: {
  stepKey: string
  status: ReservationTimelineStepStatus
}) {
  const isCurrent = status === 'current'

  return (
    <div className="relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center">
      {isCurrent ? (
        <span
          aria-hidden
          className={cn(
            'absolute size-7 animate-ping rounded-full opacity-75',
            stepLineClass(stepKey, status),
          )}
        />
      ) : null}
      <div
        className={cn(
          'relative flex size-7 items-center justify-center rounded-full',
          stepToneClass(stepKey, status),
        )}
      >
        <StepIcon stepKey={stepKey} />
      </div>
    </div>
  )
}

function isPendingStep(status: ReservationTimelineStepStatus): boolean {
  return status === 'upcoming' || status === 'skipped'
}

function stepToneClass(stepKey: string, status: ReservationTimelineStepStatus): string {
  if (status === 'failed') {
    return 'bg-destructive text-primary-foreground'
  }

  if (isPendingStep(status)) {
    return 'bg-muted text-muted-foreground'
  }

  return reservationStepGreenClass(stepKey)
}

function stepLineClass(stepKey: string, status: ReservationTimelineStepStatus): string {
  if (status === 'failed') {
    return 'bg-destructive'
  }

  if (isPendingStep(status)) {
    return 'bg-muted'
  }

  return reservationStepGreenBgClass(stepKey)
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

      {timeline.attachments.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
          <div>
            <p className="font-medium">Anexos da reserva</p>
            <p className="text-xs text-muted-foreground">
              Comprovantes, documentos e contratos enviados nesta reserva.
            </p>
          </div>
          {groupedAttachments(timeline.attachments).map((group) => (
            <div key={group.kind} className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
              {group.items.map((attachment) => (
                <ReservationAttachmentPreview key={attachment.id} attachment={attachment} />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <ol className="flex flex-col">
        {timeline.steps.map((step, index) => {
          const isLast = index === timeline.steps.length - 1

          return (
            <li
              key={step.key}
              className="relative flex gap-3 pb-6 last:pb-0"
              aria-current={step.status === 'current' ? 'step' : undefined}
            >
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-7 left-[13px] h-[calc(100%-14px)] w-0.5',
                    stepLineClass(step.key, step.status),
                  )}
                />
              ) : null}

              <StepMarker stepKey={step.key} status={step.status} />

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className={cn('font-medium', isPendingStep(step.status) ? 'text-muted-foreground' : null)}>
                  {step.label}
                </p>

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
                        {action === 'issue_contract' &&
                        timeline.attachments.some((attachment) => attachment.kind === 'contract_pdf')
                          ? 'Reemitir contrato'
                          : (ACTION_LABELS[action] ?? action)}
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
