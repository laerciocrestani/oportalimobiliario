import { useEffect, useRef, useState } from 'react'
import { BanknoteIcon, Building2Icon, CarIcon, FileTextIcon, PencilIcon, WalletIcon } from 'lucide-react'
import { ProposalSectionTitle } from '@/apps/broker/components/ProposalSectionTitle'
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
  MARRIED_STATUS,
  missingProposalPartyFields,
  partyDocumentDigits,
  type ProposalPartyForm,
} from '@/apps/broker/lib/proposal-party'
import {
  appendAdjustedPrices,
  buildPriceAdjustmentValues,
  formatProposalAmount,
  parseProposalAmount,
} from '@/apps/broker/lib/proposal-price'
import { toast } from 'sonner'
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
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
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [templates, setTemplates] = useState<BrokerProposalTemplate[] | null>(null)
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [unitPriceOverride, setUnitPriceOverride] = useState<number | null>(null)
  const [garagePriceOverrides, setGaragePriceOverrides] = useState<Record<number, number>>({})
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

    const amount = spot.price != null && spot.price !== '' ? Number(spot.price) : null

    return [{
      id: spot.id,
      code,
      amount: amount != null && Number.isFinite(amount) ? amount : null,
    }]
  })
  const boxLabel = garageLines.map((spot) => spot.code).join(', ')
    || selectedTemplate?.prefill.box
    || '—'
  const buildingLabel = buildingName || selectedTemplate?.prefill.nome_empreendimento || ''
  const unitCode = unit?.code.trim() ?? ''
  const unitOriginal = unit?.price != null && unit.price !== '' && Number.isFinite(Number(unit.price))
    ? Number(unit.price)
    : null
  const effectiveUnit = unitOriginal == null ? null : (unitPriceOverride ?? unitOriginal)
  const pricedGarages = garageLines.map((spot) => ({
    id: spot.id,
    code: spot.code,
    original: spot.amount,
    amount: spot.amount == null ? null : (garagePriceOverrides[spot.id] ?? spot.amount),
  }))
  const garageAmount = pricedGarages.reduce((sum, spot) => sum + (spot.amount ?? 0), 0)
  const proposalTotal = effectiveUnit != null && pricedGarages.some((spot) => spot.amount != null)
    ? formatListedPrice(String(Math.round((effectiveUnit + garageAmount) * 100) / 100))
    : null
  const priceAdjustment = buildPriceAdjustmentValues({
    unitOriginal,
    unitAmount: effectiveUnit,
    garages: pricedGarages,
  })
  const garageTotal = pricedGarages.some((spot) => spot.amount != null) ? garageAmount : 0
  const proposalFinal = effectiveUnit == null
    ? (selectedTemplate?.prefill.preco_final ?? '')
    : formatProposalAmount(Math.round((effectiveUnit + garageTotal) * 100) / 100)
  const brokerName = selectedTemplate?.prefill.nome_corretor || '—'
  const brokerageName = selectedTemplate?.prefill.imobiliaria || '—'
  const mergedValues: Record<string, string> = {
    ...values,
    ...priceAdjustment,
    ...(proposalFinal !== '' ? { preco_final: proposalFinal } : {}),
    nome_cliente: buyerName,
    telefone_cliente: buyerPhone,
    email_cliente: buyerEmail,
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
    imobiliaria: brokerageName === '—' ? '' : brokerageName,
    nome_corretor: brokerName === '—' ? '' : brokerName,
    correcao_modo: selectedTemplate?.prefill.correcao_modo === 'fixed' ? 'fixed' : 'incc',
  }
  const fillableVariables = selectedTemplate?.variables.filter((variable) => !isHiddenProposalSlug(variable.slug)) ?? []
  const missingFields = [
    ...missingProposalPartyFields(party, {
      name: buyerName,
      phone: buyerPhone,
      email: buyerEmail,
    }),
    ...(selectedTemplate
      ? fillableVariables.flatMap((variable) => (
        variable.required === false || (mergedValues[variable.slug] ?? '').trim() !== ''
          ? []
          : [variable.label]
      ))
      : (paymentTerms.trim() === '' ? ['Proposta'] : [])),
  ]

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

  useEffect(() => {
    if (!open) {
      return
    }

    setBuyerName(clientName)
    setBuyerPhone(clientPhone)
    setBuyerEmail(clientEmail)
  }, [open, clientName, clientPhone, clientEmail])

  function resetState() {
    setPaymentTerms('')
    setDepositKind('pix')
    setError(null)
    setExpired(false)
    setRemainingTime(null)
    setRemainingPercent(100)
    setRemainingTone('green')
    setParty(emptyProposalPartyForm())
    setBuyerName('')
    setBuyerPhone('')
    setBuyerEmail('')
    setTemplates(null)
    setTemplateId(null)
    setValues({})
    setUnitPriceOverride(null)
    setGaragePriceOverrides({})
    setFiles([])
  }

  function commitUnitPrice(next: number) {
    if (unitOriginal == null || Math.round(next * 100) === Math.round(unitOriginal * 100)) {
      setUnitPriceOverride(null)
      return
    }

    setUnitPriceOverride(next)
  }

  function commitGaragePrice(id: number, next: number) {
    const original = garageLines.find((spot) => spot.id === id)?.amount

    setGaragePriceOverrides((current) => {
      const copy = { ...current }

      if (original == null || Math.round(next * 100) === Math.round(original * 100)) {
        delete copy[id]
        return copy
      }

      copy[id] = next
      return copy
    })
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
    if (!unit || !reservationId || submitting) {
      return
    }

    if (expired) {
      toast.error('Sua pré-reserva expirou. Feche este diálogo e tente novamente.')
      return
    }

    if (missingFields.length > 0) {
      toast.warning('Complete a proposta antes de enviar', {
        description: missingFields.join(', '),
      })
      return
    }

    const terms = selectedTemplate
      ? renderProposalPlainText(selectedTemplate.body_markdown, mergedValues)
      : paymentTerms.trim()
    const commercialTerms = commercialTermsFromValues(mergedValues)

    const paymentTermsText = appendAdjustedPrices(terms, {
      ...priceAdjustment,
      correcao_modo: mergedValues.correcao_modo ?? 'incc',
    })

    const married = party.kind === 'individual' && party.maritalStatus === MARRIED_STATUS
    const payload: ReservationProposalInput = {
      client_name: buyerName.trim(),
      client_phone: buyerPhone.trim(),
      party_kind: party.kind,
      client_cpf: partyDocumentDigits(party),
      address: party.address.trim(),
      city: party.city.trim(),
      state: party.state.trim(),
      zip: party.zip.trim(),
      payment_terms: paymentTermsText,
      ...(commercialTerms ? { commercial_terms: commercialTerms } : {}),
      deposit_kind: depositKind,
      ...(buyerEmail.trim() !== '' ? { client_email: buyerEmail.trim() } : {}),
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
              unitAmount={effectiveUnit}
              unitOriginal={unitOriginal}
              proposalTotal={proposalTotal}
              garageLines={pricedGarages}
              disabled={expired}
              onUnitPriceCommit={commitUnitPrice}
              onGaragePriceCommit={commitGaragePrice}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <Separator />
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
                  <ProposalPartyFields
                    form={party}
                    contact={{ name: buyerName, phone: buyerPhone, email: buyerEmail }}
                    disabled={expired}
                    onChange={setParty}
                    onContactChange={(contact) => {
                      setBuyerName(contact.name)
                      setBuyerPhone(contact.phone)
                      setBuyerEmail(contact.email)
                    }}
                  />

                  <fieldset className="flex flex-col gap-4" disabled={expired}>
                    <legend className="mb-4 w-full">
                      <ProposalSectionTitle
                        icon={BanknoteIcon}
                        description="Informe como o sinal será pago e as condições comerciais desta proposta."
                      >
                        Condições de pagamento
                      </ProposalSectionTitle>
                    </legend>
                    <div className="flex flex-col gap-4 rounded-lg border bg-muted p-4 [&_input]:bg-background [&_textarea]:bg-background">
                      <div className="flex flex-col gap-2">
                        <ProposalSectionTitle icon={WalletIcon}>Tipo de sinal</ProposalSectionTitle>
                        <div className="grid grid-cols-2 gap-3">
                          <label
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm',
                              depositKind === 'pix'
                                ? 'border-primary bg-primary/10 dark:bg-primary/15'
                                : 'border-input bg-background',
                            )}
                          >
                            <input
                              type="radio"
                              name="deposit-kind"
                              className="accent-primary"
                              value="pix"
                              checked={depositKind === 'pix'}
                              onChange={() => setDepositKind('pix')}
                            />
                            PIX
                          </label>
                          <label
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm',
                              depositKind === 'asset'
                                ? 'border-primary bg-primary/10 dark:bg-primary/15'
                                : 'border-input bg-background',
                            )}
                          >
                            <input
                              type="radio"
                              name="deposit-kind"
                              className="accent-primary"
                              value="asset"
                              checked={depositKind === 'asset'}
                              onChange={() => setDepositKind('asset')}
                            />
                            <span>Bem já descrito na proposta (<span className="font-bold">Dação</span>)</span>
                          </label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          O PIX pede comprovante depois que todos assinarem. O bem segue para os dados do contrato.
                        </p>
                      </div>
                      <Separator />
                      {selectedTemplate ? (
                        <ProposalTermsFields
                          body={selectedTemplate.body_markdown}
                          variables={fillableVariables}
                          values={mergedValues}
                          disabled={expired}
                          onChange={(slug, value) => {
                            setValues((current) => ({ ...current, [slug]: value }))
                          }}
                        />
                      ) : (
                        <Field>
                          <FieldLabel htmlFor="proposal-terms">Proposta *</FieldLabel>
                          <Textarea
                            id="proposal-terms"
                            className="min-h-32"
                            value={paymentTerms}
                            onChange={(event) => setPaymentTerms(event.target.value)}
                            placeholder="Ex: Entrada de R$ 50.000 + 24x de R$ 5.000"
                          />
                          <FieldDescription>
                            Esta construtora ainda não publicou um modelo. Descreva a proposta comercial.
                          </FieldDescription>
                        </Field>
                      )}
                    </div>
                  </fieldset>
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
            disabled={submitting}
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
  unitAmount,
  unitOriginal,
  proposalTotal,
  garageLines,
  disabled,
  onUnitPriceCommit,
  onGaragePriceCommit,
}: {
  buildingName: string
  unitCode: string
  unitAmount: number | null
  unitOriginal: number | null
  proposalTotal: string | null
  garageLines: { id: number; code: string; amount: number | null; original: number | null }[]
  disabled: boolean
  onUnitPriceCommit: (amount: number) => void
  onGaragePriceCommit: (id: number, amount: number) => void
}) {
  const hasGarages = garageLines.length > 0
  const pricedGarages = garageLines.filter((spot) => spot.amount != null && spot.original != null)

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
        {unitAmount != null && unitOriginal != null ? (
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Valor da unidade</p>
            <EditableListedPrice
              label="Valor da unidade"
              amount={unitAmount}
              original={unitOriginal}
              disabled={disabled}
              onCommit={onUnitPriceCommit}
            />
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 border-t bg-muted/40 px-4 py-2.5 text-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <CarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="font-medium">Vagas vinculadas</span>
          {hasGarages ? (
            garageLines.map((spot) => (
              <span key={spot.id} className="font-medium">{spot.code}</span>
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
        {pricedGarages.length > 0 ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {pricedGarages.map((spot) => (
              <EditableListedPrice
                key={spot.id}
                label={`Valor da vaga ${spot.code}`}
                amount={spot.amount ?? 0}
                original={spot.original ?? 0}
                disabled={disabled}
                onCommit={(amount) => onGaragePriceCommit(spot.id, amount)}
              />
            ))}
          </div>
        ) : null}
      </div>
      {proposalTotal ? (
        <div className="flex items-center justify-between gap-4 border-t px-4 py-2.5">
          <p className="text-sm font-medium">Total da proposta</p>
          <Badge className="h-auto px-3 py-1 text-sm font-medium tabular-nums">{proposalTotal}</Badge>
        </div>
      ) : null}
    </section>
  )
}

function EditableListedPrice({
  label,
  amount,
  original,
  disabled,
  onCommit,
}: {
  label: string
  amount: number
  original: number
  disabled: boolean
  onCommit: (amount: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const cancelRef = useRef(false)
  const changed = Math.round(amount * 100) !== Math.round(original * 100)

  function start() {
    cancelRef.current = false
    setDraft(formatProposalAmount(amount))
    setEditing(true)
  }

  function commit(raw: string) {
    if (cancelRef.current) {
      cancelRef.current = false
      setEditing(false)
      return
    }

    const parsed = parseProposalAmount(raw)
    setEditing(false)

    if (parsed === null) {
      return
    }

    onCommit(parsed)
  }

  return (
    <div className="flex items-baseline justify-end gap-2">
      {changed ? (
        <span className="text-xs text-muted-foreground line-through tabular-nums">
          {formatListedPrice(String(original))}
        </span>
      ) : null}
      {editing ? (
        <Input
          autoFocus
          aria-label={label}
          inputMode="decimal"
          className="h-8 w-40 bg-background text-right font-semibold tabular-nums md:text-base"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={(event) => commit(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              cancelRef.current = true
              setEditing(false)
            }
          }}
        />
      ) : (
        <p className="text-lg font-semibold tabular-nums">{formatListedPrice(String(amount))}</p>
      )}
      {editing ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          aria-label={`Editar ${label.charAt(0).toLowerCase()}${label.slice(1)}`}
          onClick={start}
        >
          <PencilIcon />
        </Button>
      )}
    </div>
  )
}
