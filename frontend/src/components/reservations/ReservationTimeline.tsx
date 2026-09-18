import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { ReservationAttachmentPreview } from '@/components/reservations/ReservationAttachmentPreview'
import {
  downloadReservationAttachment,
  latestAttachmentByKind,
  latestContractPdf,
} from '@/components/reservations/download-reservation-attachment'
import {
  timelineKanbanColumn,
  visibleColumnActions,
} from '@/components/reservations/reservation-kanban'
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
  submit_proposal: 'Enviar proposta',
  submit_deposit_proof: 'Anexar comprovante',
  return_signed_proposal: 'Devolver proposta assinada',
  extend_hold: 'Estender prazo (+48h)',
  drop_hold: 'Encerrar pré-reserva',
  approve_deposit_proof: 'Validar comprovante',
  submit_contract_data: 'Enviar dados do contrato',
  issue_contract: 'Emitir contrato',
  upload_signed_contract: 'Enviar contrato assinado pelo comprador',
  upload_builder_signed_contract: 'Enviar contrato assinado pela construtora',
  sign_as_witness: 'Registrar assinatura da testemunha',
  mark_signed_gov: 'Registrar assinatura GOV',
  validate_contract: 'Unidade vendida',
}

const ATTACHMENT_KIND_LABELS: Record<string, string> = {
  proposal: 'Anexos da proposta',
  proposal_pdf: 'Proposta gerada',
  proposal_signed_builder: 'Proposta assinada pela construtora',
  proposal_signed_both: 'Proposta assinada por ambas as partes',
  deposit_proof: 'Comprovante de pagamento',
  contract_documentation: 'Documentação do cliente',
  contract_pdf: 'Contrato',
  contract_signed: 'Contrato assinado pelo comprador',
  contract_signed_builder: 'Contrato assinado pela construtora',
}

const ATTACHMENT_KIND_ORDER = [
  'proposal',
  'proposal_pdf',
  'proposal_signed_builder',
  'proposal_signed_both',
  'deposit_proof',
  'contract_documentation',
  'contract_pdf',
  'contract_signed',
  'contract_signed_builder',
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

function currentStepContractPdf(
  stepKey: string,
  issued: ReservationAttachment | null,
  buyerSigned: ReservationAttachment | null,
  builderSigned: ReservationAttachment | null,
): ReservationAttachment | null {
  if (stepKey === 'contract_issue' || stepKey === 'contract_sign_gov') {
    return issued
  }

  if (stepKey === 'contract_builder_sign') {
    return buyerSigned
  }

  if (stepKey === 'contract_witness_1' || stepKey === 'contract_witness_2' || stepKey === 'contract_validate') {
    return builderSigned
  }

  return null
}

function stepToneClass(stepKey: string, status: ReservationTimelineStepStatus): string {
  if (status === 'failed') {
    return 'bg-destructive text-primary-foreground'
  }

  return reservationStepGreenClass(stepKey)
}

function stepLineClass(stepKey: string, status: ReservationTimelineStepStatus): string {
  if (status === 'failed') {
    return 'bg-destructive'
  }

  return reservationStepGreenBgClass(stepKey)
}

type ReservationTimelineProps = {
  timeline: ReservationTimeline
  onAction?: (action: string) => void
  className?: string
}

export function ReservationTimeline({ timeline, onAction, className }: ReservationTimelineProps) {
  const column = timelineKanbanColumn(timeline)
  const currentStep = timeline.steps.find((step) => step.status === 'current' || step.status === 'failed')
  const actions = currentStep ? visibleColumnActions(column, currentStep.actions) : []
  const contractPdf = latestContractPdf(timeline.attachments)
  const buyerSignedPdf = latestAttachmentByKind(timeline.attachments, 'contract_signed')
  const builderSignedPdf = latestAttachmentByKind(timeline.attachments, 'contract_signed_builder')
  const stepPdf =
    currentStep && column === 'contract'
      ? currentStepContractPdf(currentStep.key, contractPdf, buyerSignedPdf, builderSignedPdf)
      : null

  const skipCurrentStep =
    column === 'cancelled' ||
    (column === 'pre_reservation' &&
      (currentStep?.key === 'pre_hold_created' ||
        currentStep?.key === 'dialogue' ||
        currentStep?.key === 'proposal_submitted'))

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-4', className)}>
      <div className="flex shrink-0 flex-col gap-3">
        <div className="rounded-lg border bg-muted/20 p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Unidade:</span>{' '}
            <span className="font-medium">{timeline.unit.code}</span>
          </p>
          {timeline.client ? (
            <p className="mt-1">
              <span className="text-muted-foreground">Cliente:</span>{' '}
              <span className="font-medium">{timeline.client.name}</span>
            </p>
          ) : null}
          {timeline.expires_at ? (
            <p className="mt-1 text-muted-foreground">
              Prazo: {formatDateTime(timeline.expires_at)}
            </p>
          ) : null}
          {timeline.deposit_overdue && column === 'docs_deposit' ? (
            <p className="mt-1 text-sm text-destructive">
              Prazo de sinal vencido — envie o comprovante o quanto antes.
            </p>
          ) : null}
        </div>

        {currentStep ? (
          <div className="flex gap-3" aria-current={currentStep.status === 'current' ? 'step' : undefined}>
            {skipCurrentStep ? null : (
              <div className="relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center">
                {currentStep.status === 'current' ? (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute size-7 animate-ping rounded-full opacity-75',
                      stepLineClass(currentStep.key, currentStep.status),
                    )}
                  />
                ) : null}
                <div
                  className={cn(
                    'relative flex size-7 items-center justify-center rounded-full',
                    stepToneClass(currentStep.key, currentStep.status),
                  )}
                >
                  <StepIcon stepKey={currentStep.key} />
                </div>
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {skipCurrentStep ? null : <p className="font-medium">{currentStep.label}</p>}

              {!skipCurrentStep && currentStep.occurred_at ? (
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(currentStep.occurred_at)}
                  {currentStep.actor ? ` · ${currentStep.actor.name}` : ''}
                </p>
              ) : null}

              {currentStep.status === 'current' && currentStep.due_at ? (
                <p className="text-xs text-muted-foreground">
                  Vence em {formatDateTime(currentStep.due_at)}
                </p>
              ) : null}

              {stepPdf ? (
                <div className="flex flex-col gap-2">
                  <ReservationAttachmentPreview attachment={stepPdf} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void downloadReservationAttachment(stepPdf)}
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Baixar PDF
                  </Button>
                </div>
              ) : null}

              {actions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <Button
                      key={action}
                      type="button"
                      size="sm"
                      variant={action === 'drop_hold' ? 'destructive' : 'default'}
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
          </div>
        ) : null}
      </div>

      <Separator />

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div>
          <p className="font-medium">Arquivos da reserva</p>
          <p className="text-xs text-muted-foreground">
            Comprovantes, documentos, PDFs e contratos enviados nesta reserva.
          </p>
        </div>
        {timeline.attachments.length === 0 ? (
          <Empty className="min-h-0 flex-1 border border-dashed">
            <EmptyHeader>
              <EmptyTitle>Nenhum arquivo enviado ainda</EmptyTitle>
              <EmptyDescription>Os arquivos desta reserva aparecem nesta área.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            {groupedAttachments(timeline.attachments).map((group) => (
              <div key={group.kind} className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
                {group.items.map((attachment) => (
                  <ReservationAttachmentPreview key={attachment.id} attachment={attachment} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
