import { useEffect, useState } from 'react'
import { Building2Icon, CarIcon, FileTextIcon } from 'lucide-react'
import { ProposalPartyFields } from '@/apps/broker/components/ProposalPartyFields'
import { ProposalTermsFields } from '@/apps/broker/components/ProposalTermsFields'
import { draftSendProgress } from '@/apps/broker/lib/draft-send-progress'
import {
  commercialTermsFromValues,
  isHiddenProposalSlug,
  prefillProposalValues,
  renderProposalPlainText,
} from '@/apps/broker/lib/fill-proposal-template'
import {
  emptyProposalPartyForm,
  isProposalPartyComplete,
  MARRIED_STATUS,
  partyDocumentDigits,
  type ProposalPartyForm,
} from '@/apps/broker/lib/proposal-party'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ProposalDecisionAlert } from '@/components/reservations/ProposalDecisionAlert'
import {
  ReservationAttachmentField,
  useReservationFileItems,
} from '@/components/reservations/ReservationAttachmentField'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { brokerApi, type BrokerClient, type BrokerProposalTemplate, type GarageUnit, type ReservationProposal, type ReservationProposalInput, type ReservationTimelineClient, type Unit } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatBrazilianMobilePhone } from '@/lib/format-phone'
import { formatListedPrice } from '@/lib/unit-listing'

type BrokerReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit: Unit | null
  garageUnits?: GarageUnit[]
  reservationId: number | null
  expiresAt: string | null
  onReserved: () => void
  releaseHoldOnClose?: boolean
  client?: BrokerClient | ReservationTimelineClient | null
  proposal?: ReservationProposal | null
  onOpenDialogue?: () => void
}

const PROGRESS_TONE = {
  green: '[&_[data-slot=progress-indicator]]:bg-emerald-600',
  yellow: '[&_[data-slot=progress-indicator]]:bg-amber-500',
  red: '[&_[data-slot=progress-indicator]]:bg-red-600',
} as const

export function BrokerReservationDialog({
  open,
  onOpenChange,
  unit,
  garageUnits = [],
  reservationId,
  expiresAt,
  onReserved,
  releaseHoldOnClose = true,
  client = null,
  proposal = null,
  onOpenDialogue,
}: BrokerReservationDialogProps) {
  const [paymentTerms, setPaymentTerms] = useState('')
  const [depositKind, setDepositKind] = useState<'pix' | 'asset'>('pix')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [remainingTime, setRemainingTime] = useState<string | null>(null)
  const [remainingPercent, setRemainingPercent] = useState(100)
  const [remainingTone, setRemainingTone] = useState<'green' | 'yellow' | 'red'>('green')
  const [expired, setExpired] = useState(false)
  const [party, setParty] = useState<ProposalPartyForm>(emptyProposalPartyForm)
  const [templates, setTemplates] = useState<BrokerProposalTemplate[] | null>(null)
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const { files, setFiles } = useReservationFileItems()

  const clientName = client?.name.trim() ?? ''
  const clientPhone = client?.phone ? formatBrazilianMobilePhone(client.phone) : ''
  const clientEmail = client?.email?.trim() ?? ''
  const buildingName = unit?.building?.name.trim() ?? ''
  const knownValues = {
    name: clientName,
    phone: clientPhone,
    email: clientEmail,
    unitCode: unit?.code.trim() ?? '',
    buildingName,
  }
  const selectedTemplate = templates?.find((template) => template.id === templateId) ?? null
  const garageLines = garageUnits.flatMap((spot) => {
    const code = spot.code.trim()
    if (code === '') {
      return []
    }

    return [{ id: spot.id, code, price: spot.price ? formatListedPrice(spot.price) : null }]
  })
  const boxLabel = garageLines.map((spot) => spot.code).join(', ')
    || selectedTemplate?.prefill.box
    || '—'
  const buildingLabel = buildingName || selectedTemplate?.prefill.nome_empreendimento || ''
  const unitCode = unit?.code.trim() ?? ''
  const unitPrice = unit?.price ? formatListedPrice(unit.price) : null
  const brokerName = selectedTemplate?.prefill.nome_corretor || '—'
  const brokerageName = selectedTemplate?.prefill.imobiliaria || '—'
  const mergedValues: Record<string, string> = {
    ...values,
    nome_cliente: clientName,
    telefone_cliente: clientPhone,
    email_cliente: clientEmail,
    cpf_cliente: party.document,
    rg_cliente: party.kind === 'individual' ? party.rg : '',
    estado_civil: party.kind === 'individual' ? party.maritalStatus : '',
    nacionalidade_cliente: party.kind === 'individual' ? party.nationality : '',
    profissao_cliente: party.kind === 'individual' ? party.profession : '',
    endereco_cliente: party.address,
    cidade_cliente: party.city,
    uf_cliente: party.state,
    cep_cliente: party.zip,
    nome_empreendimento: buildingName,
    codigo_unidade: unit?.code.trim() ?? '',
    box: boxLabel === '—' ? '' : boxLabel,
    nome_corretor: brokerName === '—' ? '' : brokerName,
  }
  const fillableVariables = selectedTemplate?.variables.filter((variable) => !isHiddenProposalSlug(variable.slug)) ?? []
  const templateComplete = selectedTemplate !== null
    && fillableVariables.every((variable) => variable.required === false || (mergedValues[variable.slug] ?? '').trim() !== '')
  const partyComplete = isProposalPartyComplete(party)

  useEffect(() => {
    if (!open || !expiresAt) {
      setRemainingTime(null)
      setRemainingPercent(100)
      setRemainingTone('green')
      setExpired(false)
      return
    }

    function tick() {
      const progress = draftSendProgress(expiresAt)
      setExpired(progress.expired)
      setRemainingTime(progress.label)
      setRemainingPercent(progress.percent)
      setRemainingTone(progress.tone)
    }

    tick()
    const intervalId = window.setInterval(tick, 1000)

    return () => window.clearInterval(intervalId)
  }, [expiresAt, open])

  useEffect(() => {
    if (!open || reservationId === null) {
      return
    }

    let cancelled = false
    setTemplates(null)

    void brokerApi.listReservationProposalTemplates(reservationId)
      .then((nextTemplates) => {
        if (cancelled) {
          return
        }

        setTemplates(nextTemplates)
        const first = nextTemplates[0]
        if (!first) {
          setTemplateId(null)
          setValues({})
          return
        }

        setTemplateId(first.id)
        setValues(prefillProposalValues(first, knownValues))
      })
      .catch(() => {
        if (!cancelled) {
          setTemplates([])
          setTemplateId(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, reservationId, clientName, clientPhone, clientEmail, unit?.code, buildingName])

  function resetState() {
    setPaymentTerms('')
    setDepositKind('pix')
    setError(null)
    setExpired(false)
    setRemainingTime(null)
    setRemainingPercent(100)
    setRemainingTone('green')
    setParty(emptyProposalPartyForm())
    setTemplates(null)
    setTemplateId(null)
    setValues({})
    setFiles([])
  }

  function selectTemplate(nextId: number) {
    const template = templates?.find((item) => item.id === nextId)
    if (!template) {
      return
    }

    setTemplateId(nextId)
    setValues(prefillProposalValues(template, knownValues))
  }

  async function releaseHoldIfNeeded() {
    if (!reservationId) {
      return
    }

    try {
      await brokerApi.releasePreHold(reservationId)
    } catch {
      // Hold pode ter expirado ou já ter sido enviado.
    }
  }

  async function handleClose() {
    if (releaseHoldOnClose && reservationId && !submitting) {
      await releaseHoldIfNeeded()
    }

    resetState()
    onOpenChange(false)
  }

  async function handleSubmit() {
    if (!unit || !reservationId || expired || clientName === '' || clientPhone === '' || files.length === 0) {
      return
    }

    const terms = selectedTemplate
      ? renderProposalPlainText(selectedTemplate.body_markdown, mergedValues)
      : paymentTerms.trim()
    const commercialTerms = commercialTermsFromValues(mergedValues)

    if (terms === '' || !partyComplete || (selectedTemplate !== null && !templateComplete)) {
      return
    }

    const married = party.kind === 'individual' && party.maritalStatus === MARRIED_STATUS
    const payload: ReservationProposalInput = {
      client_name: clientName,
      client_phone: clientPhone,
      party_kind: party.kind,
      client_cpf: partyDocumentDigits(party),
      address: party.address.trim(),
      city: party.city.trim(),
      state: party.state.trim(),
      zip: party.zip.trim(),
      payment_terms: terms,
      ...(commercialTerms ? { commercial_terms: commercialTerms } : {}),
      deposit_kind: depositKind,
      ...(clientEmail !== '' ? { client_email: clientEmail } : {}),
      ...(party.kind === 'individual'
        ? {
            client_rg: party.rg.trim(),
            marital_status: party.maritalStatus,
            nationality: party.nationality.trim(),
            profession: party.profession.trim(),
            ...(married
              ? {
                  spouse_name: party.spouseName.trim(),
                  spouse_cpf: party.spouseCpf.replace(/\D/g, ''),
                }
              : {}),
          }
        : {}),
    }

    setSubmitting(true)
    setError(null)

    try {
      await brokerApi.submitReservationProposal(
        reservationId,
        payload,
        files.map((item) => item.file),
      )
      resetState()
      onOpenChange(false)
      onReserved()
    } catch {
      setError('Não foi possível enviar a proposta. Verifique se o prazo de 20 minutos ainda está válido.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = clientName !== ''
    && clientPhone !== ''
    && partyComplete
    && files.length > 0
    && (selectedTemplate ? templateComplete : paymentTerms.trim() !== '')

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void handleClose()
          return
        }

        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="h-[92vh] max-h-[92vh] gap-3 overflow-hidden sm:max-w-6xl">
        <DialogHeader className="pr-8">
          <div className="flex w-full items-center gap-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <FileTextIcon className="size-5" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <DialogTitle>Proposta</DialogTitle>
                <DialogDescription className="sr-only">
                  Envie a proposta da unidade dentro do prazo da pré-reserva.
                </DialogDescription>
              </div>
            </div>
            <div className="flex w-[30%] shrink-0 flex-col items-center gap-1">
              <p className={cn('text-center text-xs font-medium tabular-nums', expired && 'text-destructive')}>
                Enviar em {remainingTime ?? '—'}
              </p>
              <Progress
                value={expired ? 0 : remainingPercent}
                aria-label="Tempo restante para enviar a proposta"
                data-tone={remainingTone}
                className={cn('w-full gap-0', PROGRESS_TONE[remainingTone])}
              />
              {expired ? (
                <p className="w-full text-center text-xs text-destructive">
                  Sua pré-reserva expirou. Feche este dialog e tente novamente.
                </p>
              ) : null}
            </div>
          </div>
          <Separator />
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 overflow-hidden px-0">
          {proposal && onOpenDialogue ? (
            <div className="px-6">
              <ProposalDecisionAlert
                proposal={proposal}
                onOpenDialogue={onOpenDialogue}
                showProposal={false}
              />
            </div>
          ) : null}

          <div className="px-6">
            <ProposalSubjectCard
              buildingName={buildingLabel}
              unitCode={unitCode}
              unitPrice={unitPrice}
              garageLines={garageLines}
            />
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-4">
              {templates === null ? (
                <div className="flex h-full flex-col gap-3" aria-busy="true" aria-label="Carregando proposta">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-2/3" />
                </div>
              ) : (
                <FieldGroup>
                  <FieldSet>
                    <Field>
                      <FieldLabel htmlFor="proposal-brokerage">Imobiliária</FieldLabel>
                      <Input id="proposal-brokerage" readOnly className="bg-muted" value={brokerageName} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="proposal-broker">Corretor</FieldLabel>
                      <Input id="proposal-broker" readOnly className="bg-muted" value={brokerName} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="proposal-client-name">Nome</FieldLabel>
                      <Input id="proposal-client-name" readOnly className="bg-muted" value={clientName || '—'} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="proposal-client-phone">Telefone</FieldLabel>
                      <Input id="proposal-client-phone" readOnly className="bg-muted" value={clientPhone || '—'} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="proposal-client-email">E-mail</FieldLabel>
                      <Input id="proposal-client-email" readOnly className="bg-muted" value={clientEmail || '—'} />
                    </Field>
                  </FieldSet>

                  <ProposalPartyFields form={party} disabled={expired} onChange={setParty} />

                  <FieldSet>
                    <FieldLegend>Tipo de sinal</FieldLegend>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="deposit-kind"
                          value="pix"
                          checked={depositKind === 'pix'}
                          disabled={expired}
                          onChange={() => setDepositKind('pix')}
                        />
                        PIX
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="deposit-kind"
                          value="asset"
                          checked={depositKind === 'asset'}
                          disabled={expired}
                          onChange={() => setDepositKind('asset')}
                        />
                        Bem já descrito na proposta
                      </label>
                    </div>
                    <FieldDescription>
                      O PIX pede comprovante depois que todos assinarem. O bem segue para os dados do contrato.
                    </FieldDescription>
                  </FieldSet>

                  {selectedTemplate ? (
                    <FieldSet>
                      <FieldLegend>Condições</FieldLegend>
                      <ProposalTermsFields
                        body={selectedTemplate.body_markdown}
                        variables={fillableVariables}
                        values={mergedValues}
                        disabled={expired}
                        onChange={(slug, value) => {
                          setValues((current) => ({ ...current, [slug]: value }))
                        }}
                      />
                    </FieldSet>
                  ) : (
                    <Field>
                      <FieldLabel htmlFor="proposal-terms">Proposta *</FieldLabel>
                      <Textarea
                        id="proposal-terms"
                        className="min-h-32"
                        value={paymentTerms}
                        onChange={(event) => setPaymentTerms(event.target.value)}
                        placeholder="Ex: Entrada de R$ 50.000 + 24x de R$ 5.000"
                        disabled={expired}
                      />
                      <FieldDescription>
                        Esta construtora ainda não publicou um modelo. Descreva a proposta comercial.
                      </FieldDescription>
                    </Field>
                  )}
                </FieldGroup>
              )}
            </div>

            <aside className="flex w-80 min-h-0 shrink-0 flex-col border-l p-4">
              <ReservationAttachmentField
                className="min-h-0 flex-1"
                files={files}
                onFilesChange={setFiles}
                multiple
                disabled={expired}
                variant="panel"
                emptyLabel="Anexar documentos da proposta"
              />
            </aside>
          </div>

          {error ? <p className="px-6 text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          {templates !== null && templates.length > 1 ? (
            <Select
              value={templateId === null ? null : String(templateId)}
              onValueChange={(value) => {
                if (value === null) {
                  return
                }
                selectTemplate(Number(value))
              }}
            >
              <SelectTrigger className="w-full sm:w-72" aria-label="Modelo da construtora" disabled={expired}>
                <SelectValue placeholder="Modelo da construtora">
                  {selectedTemplate?.name ?? null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={String(template.id)}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <span />
          )}
          <Button
            type="button"
            disabled={!canSubmit || submitting || expired}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Enviando...' : 'Enviar proposta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProposalSubjectCard({
  buildingName,
  unitCode,
  unitPrice,
  garageLines,
}: {
  buildingName: string
  unitCode: string
  unitPrice: string | null
  garageLines: { id: number; code: string; price: string | null }[]
}) {
  const hasGarages = garageLines.length > 0

  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-label="Unidade da proposta">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Building2Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            {buildingName !== '' ? (
              <p className="truncate text-sm text-muted-foreground">{buildingName}</p>
            ) : null}
            <p className="truncate text-base font-semibold">
              {unitCode === '' ? 'Unidade —' : `Unidade ${unitCode}`}
            </p>
          </div>
        </div>
        {unitPrice ? (
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Valor da unidade</p>
            <p className="text-lg font-semibold tabular-nums">{unitPrice}</p>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t bg-muted/40 px-4 py-2.5 text-sm">
        <CarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="font-medium">Vagas vinculadas</span>
        {hasGarages ? (
          garageLines.map((spot) => (
            <span key={spot.id} className="inline-flex items-center gap-2">
              <span className="font-medium">{spot.code}</span>
              {spot.price ? <span className="tabular-nums text-muted-foreground">{spot.price}</span> : null}
            </span>
          ))
        ) : (
          <>
            <Badge variant="secondary">Não informado</Badge>
            <span className="h-4 w-px bg-border" aria-hidden />
            <span className="text-muted-foreground">
              A identificação das vagas não foi informada nesta proposta.
            </span>
          </>
        )}
      </div>
    </section>
  )
}
