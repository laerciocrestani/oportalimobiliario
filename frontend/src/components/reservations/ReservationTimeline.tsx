import { useState } from 'react'
import { BanknoteIcon, CalendarPlusIcon, DownloadIcon, HandshakeIcon, MessageCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  ProposalCommercialTerms,
  ReservationAttachment,
  ReservationProposal,
  ReservationTimeline,
  ReservationTimelineStepStatus,
} from '@/lib/api'
import { ProposalSignatureProcess } from '@/components/reservations/ProposalSignatureProcess'
import { formatCnpj, formatCpf } from '@/lib/br-docs'
import { formatBrazilianMobilePhone } from '@/lib/format-phone'
import { formatListedPrice } from '@/lib/unit-listing'
import { formatCep } from '@/lib/viacep'
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
  review_contract: 'Contrato',
  upload_signed_contract: 'Enviar contrato assinado pelo comprador',
  upload_builder_signed_contract: 'Enviar contrato assinado pela construtora',
  sign_as_witness: 'Registrar assinatura da testemunha',
  mark_signed_gov: 'Registrar assinatura GOV',
  validate_contract: 'Unidade vendida',
}

function formatDueDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return value
  }

  return `${match[3]}/${match[2]}/${match[1]}`
}

function reinforcementLabel(row: ProposalCommercialTerms['reinforcements'][number]): string {
  const amount = row.amount ? formatListedPrice(row.amount) : null
  const due = row.due_on ? formatDueDate(row.due_on) : null

  return [amount, due].filter((part) => part !== null && part !== '').join(' · ')
}

function formatDocument(value: string): string {
  const digits = value.replace(/\D/g, '')

  if (digits === '') {
    return ''
  }

  return digits.length > 11 ? formatCnpj(digits) : formatCpf(digits)
}

function whatsAppHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')

  if (digits === '') {
    return null
  }

  const withCountry = digits.startsWith('55') && digits.length > 11 ? digits : `55${digits}`

  return `https://wa.me/${withCountry}`
}

function filled(value: string | null | undefined): string | null {
  const text = value?.trim() ?? ''

  return text === '' ? null : text
}

function clientDetailRows(proposal: ReservationProposal): Array<{ label: string; value: string }> {
  const company = proposal.party_kind === 'company'
  const document = formatDocument(proposal.client_cpf)
  const phone = filled(proposal.client_phone)
  const rows = [
    ['Nome', filled(proposal.client_name)],
    ['WhatsApp', phone ? formatBrazilianMobilePhone(phone) : null],
    ['E-mail', filled(proposal.client_email)],
    [company ? 'CNPJ' : 'CPF', document === '' ? null : document],
    ['RG', filled(proposal.client_rg)],
    ['Estado civil', filled(proposal.marital_status)],
    ['Nacionalidade', filled(proposal.nationality)],
    ['Profissão', filled(proposal.profession)],
    ['CEP', filled(proposal.zip) ? formatCep(proposal.zip) : null],
    ['Endereço', filled(proposal.address)],
    ['Cidade', filled(proposal.city)],
    ['UF', filled(proposal.state)],
    ['Cônjuge', filled(proposal.spouse_name)],
    ['CPF do cônjuge', filled(proposal.spouse_cpf) ? formatCpf(proposal.spouse_cpf ?? '') : null],
    ['Telefone do cônjuge', filled(proposal.spouse_phone) ? formatBrazilianMobilePhone(proposal.spouse_phone ?? '') : null],
    ['E-mail do cônjuge', filled(proposal.spouse_email)],
    ['RG do cônjuge', filled(proposal.spouse_rg)],
    ['Nacionalidade do cônjuge', filled(proposal.spouse_nationality)],
  ] as const

  return rows.flatMap(([label, value]) => (value ? [{ label, value }] : []))
}

function ProposalReviewSummary({ proposal }: { proposal: ReservationProposal }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const name = proposal.client_name.trim()
  const phone = proposal.client_phone.trim()
  const document = formatDocument(proposal.client_cpf)
  const whatsApp = whatsAppHref(phone)
  const details = clientDetailRows(proposal)
  const reinforcements = (proposal.commercial_terms?.reinforcements ?? []).flatMap((row) => {
    const label = reinforcementLabel(row)

    return label === '' ? [] : [label]
  })
  const dations = (proposal.commercial_terms?.dations ?? []).flatMap((line) => {
    const text = line.trim()

    return text === '' ? [] : [text]
  })
  const paymentDescription = filled(proposal.commercial_terms?.description)

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">Nome:</span>
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 py-0 font-medium"
            onClick={() => setDetailsOpen(true)}
          >
            {name === '' ? 'Ver dados' : name}
          </Button>
        </p>
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">WhatsApp:</span>
          {whatsApp ? (
            <a
              href={whatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
              aria-label={`Conversar no WhatsApp com ${name === '' ? 'o cliente' : name}`}
            >
              {formatBrazilianMobilePhone(phone)}
              <MessageCircleIcon className="size-4 text-emerald-600" aria-hidden />
            </a>
          ) : (
            <span className="font-medium">—</span>
          )}
        </p>
        <p>
          <span className="text-muted-foreground">CPF:</span>{' '}
          <span className="font-medium">{document === '' ? '—' : document}</span>
        </p>
      </div>
      {paymentDescription || reinforcements.length > 0 || dations.length > 0 ? (
        <>
          <Separator />
          {paymentDescription ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 font-medium">
                <BanknoteIcon className="size-4 text-primary" aria-hidden />
                Descrição
              </p>
              <p className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-muted-foreground">
                {paymentDescription}
              </p>
            </div>
          ) : null}
          {reinforcements.length > 0 ? (
            <div>
              <p className="flex items-center gap-2 font-medium">
                <CalendarPlusIcon className="size-4 text-primary" aria-hidden />
                Reforços
              </p>
              <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                {reinforcements.map((label, index) => (
                  <li key={`${index}-${label}`}>{label}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {dations.length > 0 ? (
            <div>
              <p className="flex items-center gap-2 font-medium">
                <HandshakeIcon className="size-4 text-primary" aria-hidden />
                Dação
              </p>
              <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                {dations.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dados do cliente</DialogTitle>
            <DialogDescription>Informações preenchidas na proposta.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {details.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado informado.</p>
            ) : (
              <dl className="flex flex-col gap-2 text-sm">
                {details.map((row) => (
                  <div key={row.label} className="flex items-baseline gap-2">
                    <dt className="shrink-0 text-muted-foreground">{row.label}:</dt>
                    <dd className="min-w-0 font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
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
  signatureResend?: {
    profile: 'broker' | 'builder'
    reservationId: number
    document?: 'proposal' | 'contract'
  }
}

export function ReservationTimeline({ timeline, onAction, className, signatureResend }: ReservationTimelineProps) {
  const column = timelineKanbanColumn(timeline)
  const currentStep = timeline.steps.find((step) => step.status === 'current' || step.status === 'failed')
  const actions = currentStep ? visibleColumnActions(column, currentStep.actions) : []
  const contractPdf = latestContractPdf(timeline.attachments)
  const buyerSignedPdf = latestAttachmentByKind(timeline.attachments, 'contract_signed')
  const builderSignedPdf = latestAttachmentByKind(timeline.attachments, 'contract_signed_builder')
  const stepPdf =
    currentStep && column === 'contract' && timeline.current_stage !== 'contract_signing'
      ? currentStepContractPdf(currentStep.key, contractPdf, buyerSignedPdf, builderSignedPdf)
      : null

  const signingProposal = timeline.current_stage === 'proposal_signing'
  const signingContract = timeline.current_stage === 'contract_signing' && timeline.signature_process != null
  const waitingDepositProof = column === 'docs_deposit' && currentStep?.key === 'deposit_window'
  const skipCurrentStep =
    signingProposal ||
    signingContract ||
    waitingDepositProof ||
    column === 'cancelled' ||
    column === 'proposal_review' ||
    (column === 'pre_reservation' &&
      (currentStep?.key === 'pre_hold_created' ||
        currentStep?.key === 'dialogue' ||
        currentStep?.key === 'proposal_submitted'))

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-4', className)}>
      <div className="flex shrink-0 flex-col gap-3">
        {column === 'proposal_review' && timeline.current_proposal ? (
          <ProposalReviewSummary proposal={timeline.current_proposal} />
        ) : signingProposal || signingContract || waitingDepositProof ? null : (
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Unidade:</span>{' '}
              <span className="font-medium">{timeline.unit.code}</span>
            </p>
            {column !== 'proposal_review' && timeline.client ? (
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
        )}

        {waitingDepositProof ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Aguardando o comprovante do sinal.</p>
            {timeline.deposit_overdue ? (
              <p className="text-sm text-destructive">
                Prazo de sinal vencido — envie o comprovante o quanto antes.
              </p>
            ) : null}
          </div>
        ) : null}

        {(signingProposal || signingContract) && timeline.signature_process ? (
          <ProposalSignatureProcess
            process={timeline.signature_process}
            document={signingContract ? 'contract' : 'proposal'}
            resend={signatureResend}
          />
        ) : null}

        {currentStep && !((signingProposal || signingContract || waitingDepositProof) && actions.length === 0 && !stepPdf) ? (
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

              {!waitingDepositProof && currentStep.status === 'current' && currentStep.due_at ? (
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
    </div>
  )
}
