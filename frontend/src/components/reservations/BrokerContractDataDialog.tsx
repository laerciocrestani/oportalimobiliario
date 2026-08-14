import { useEffect, useRef, useState } from 'react'
import { LoaderCircleIcon } from 'lucide-react'
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ReservationAttachmentField,
  type ReservationFileItem,
} from '@/components/reservations/ReservationAttachmentField'
import {
  brokerApi,
  type ReservationContractDataInput,
  type ReservationProposal,
  type ReservationTimelineClient,
} from '@/lib/api'
import { cpfDigits, formatCpf, formatPhone, isValidCpf } from '@/lib/br-docs'
import { formatCep, lookupCep } from '@/lib/viacep'

type BrokerContractDataDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  client: ReservationTimelineClient | null
  proposal: ReservationProposal | null
  onSubmitted: () => void
}

const MARITAL_STATUS_OPTIONS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'Separado(a)',
] as const

const MARRIED_STATUS = 'Casado(a)'

const EMPTY_FORM: ReservationContractDataInput = {
  client_name: '',
  client_phone: '',
  client_email: '',
  client_cpf: '',
  client_rg: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  marital_status: '',
  nationality: 'brasileira',
  spouse_name: '',
  spouse_phone: '',
  spouse_email: '',
  spouse_cpf: '',
  spouse_rg: '',
  spouse_nationality: 'brasileira',
}

function formFromExisting(
  client: ReservationTimelineClient | null,
  proposal: ReservationProposal | null,
): ReservationContractDataInput {
  return {
    client_name: proposal?.client_name || client?.name || '',
    client_phone: proposal?.client_phone || client?.phone || '',
    client_email: proposal?.client_email || client?.email || '',
    client_cpf: formatCpf(proposal?.client_cpf ?? ''),
    client_rg: proposal?.client_rg ?? '',
    address: proposal?.address ?? '',
    city: proposal?.city ?? '',
    state: proposal?.state ?? '',
    zip: formatCep(proposal?.zip ?? ''),
    marital_status: MARITAL_STATUS_OPTIONS.includes(
      proposal?.marital_status as (typeof MARITAL_STATUS_OPTIONS)[number],
    )
      ? proposal?.marital_status ?? ''
      : '',
    nationality: proposal?.nationality || 'brasileira',
    spouse_name: proposal?.spouse_name ?? '',
    spouse_phone: formatPhone(proposal?.spouse_phone ?? ''),
    spouse_email: proposal?.spouse_email ?? '',
    spouse_cpf: formatCpf(proposal?.spouse_cpf ?? ''),
    spouse_rg: proposal?.spouse_rg ?? '',
    spouse_nationality: proposal?.spouse_nationality || 'brasileira',
  }
}

export function BrokerContractDataDialog({
  open,
  onOpenChange,
  reservationId,
  client,
  proposal,
  onSubmitted,
}: BrokerContractDataDialogProps) {
  const [form, setForm] = useState<ReservationContractDataInput>(EMPTY_FORM)
  const [tab, setTab] = useState('client')
  const [files, setFiles] = useState<ReservationFileItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cepError, setCepError] = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const cepRequestRef = useRef<AbortController | null>(null)

  const hasSpouse = form.marital_status === MARRIED_STATUS

  useEffect(() => {
    if (!open) {
      return
    }

    setForm(formFromExisting(client, proposal))
    setTab('client')
    setFiles([])
    setError(null)
    setCepError(null)
    setCepLoading(false)
  }, [client, open, proposal])

  useEffect(() => {
    return () => {
      cepRequestRef.current?.abort()
    }
  }, [])

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      cepRequestRef.current?.abort()
      setForm(EMPTY_FORM)
      setTab('client')
      setFiles([])
      setError(null)
      setCepError(null)
      setCepLoading(false)
    }

    onOpenChange(nextOpen)
  }

  function updateField<K extends keyof ReservationContractDataInput>(
    key: K,
    value: ReservationContractDataInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleMaritalStatusChange(value: string) {
    setForm((current) => {
      if (value !== MARRIED_STATUS) {
        return {
          ...current,
          marital_status: value,
          spouse_name: '',
          spouse_phone: '',
          spouse_email: '',
          spouse_cpf: '',
          spouse_rg: '',
          spouse_nationality: 'brasileira',
        }
      }

      return { ...current, marital_status: value }
    })

    if (value !== MARRIED_STATUS) {
      setTab('client')
    }
  }

  async function fillAddressFromCep(zip: string) {
    cepRequestRef.current?.abort()
    const controller = new AbortController()
    cepRequestRef.current = controller
    setCepLoading(true)
    setCepError(null)

    try {
      const result = await lookupCep(zip, controller.signal)

      if (controller.signal.aborted) {
        return
      }

      if (!result) {
        setCepError('CEP não encontrado.')
        return
      }

      setForm((current) => ({
        ...current,
        zip: result.zip,
        address: result.address || current.address,
        city: result.city,
        state: result.state,
      }))
    } catch (caught) {
      if (controller.signal.aborted || (caught instanceof DOMException && caught.name === 'AbortError')) {
        return
      }

      setCepError('Não foi possível consultar o CEP.')
    } finally {
      if (!controller.signal.aborted) {
        setCepLoading(false)
      }
    }
  }

  function handleZipChange(value: string) {
    const formatted = formatCep(value)
    updateField('zip', formatted)
    setCepError(null)

    if (formatted.replace(/\D/g, '').length === 8) {
      void fillAddressFromCep(formatted)
      return
    }

    cepRequestRef.current?.abort()
    setCepLoading(false)
  }

  const clientCpfInvalid =
    cpfDigits(form.client_cpf).length === 11 && !isValidCpf(form.client_cpf)
  const spouseCpfInvalid =
    hasSpouse && cpfDigits(form.spouse_cpf).length === 11 && !isValidCpf(form.spouse_cpf)

  const canSubmit =
    isValidCpf(form.client_cpf) &&
    form.client_rg.trim() !== '' &&
    form.address.trim() !== '' &&
    form.city.trim() !== '' &&
    form.state.trim().length === 2 &&
    form.zip.replace(/\D/g, '').length === 8 &&
    form.marital_status.trim() !== '' &&
    form.nationality.trim() !== '' &&
    files.length > 0 &&
    (!hasSpouse ||
      (form.spouse_name.trim() !== '' &&
        isValidCpf(form.spouse_cpf) &&
        form.spouse_rg.trim() !== '' &&
        form.spouse_nationality.trim() !== ''))

  async function handleSubmit() {
    if (!canSubmit) {
      return
    }

    setSubmitting(true)
    setError(null)
    setFiles((current) => current.map((item) => ({ ...item, state: 'uploading' })))

    try {
      await brokerApi.submitContractData(
        reservationId,
        {
          ...form,
          client_cpf: cpfDigits(form.client_cpf),
          client_rg: form.client_rg.trim(),
          state: form.state.toUpperCase(),
          zip: formatCep(form.zip),
          spouse_name: hasSpouse ? form.spouse_name.trim() : '',
          spouse_phone: hasSpouse ? form.spouse_phone.trim() : '',
          spouse_email: hasSpouse ? form.spouse_email.trim() : '',
          spouse_cpf: hasSpouse ? cpfDigits(form.spouse_cpf) : '',
          spouse_rg: hasSpouse ? form.spouse_rg.trim() : '',
          spouse_nationality: hasSpouse ? form.spouse_nationality.trim() : '',
        },
        files.map((item) => item.file),
      )
      setFiles([])
      onOpenChange(false)
      onSubmitted()
    } catch {
      setError('Não foi possível enviar os dados para o contrato.')
      setFiles((current) =>
        current.map((item) => ({
          ...item,
          state: 'error',
          errorMessage: 'Falha no envio',
        })),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Dados para contrato</DialogTitle>
          <DialogDescription>
            Nome e telefone já foram cadastrados. Complete as demais informações e anexe a documentação do cliente.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className={hasSpouse ? 'w-full' : undefined}>
              <TabsTrigger value="client">Cliente</TabsTrigger>
              {hasSpouse ? <TabsTrigger value="spouse">Cônjuge</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="client" className="flex flex-col gap-5">
              <FieldGroup>
                <FieldSet>
                  <FieldLegend>Dados já cadastrados</FieldLegend>
                  <FieldGroup className="grid grid-cols-1 sm:grid-cols-2">
                    <Field data-disabled>
                      <FieldLabel htmlFor="contract-name">Nome</FieldLabel>
                      <Input id="contract-name" value={form.client_name} disabled />
                    </Field>
                    <Field data-disabled>
                      <FieldLabel htmlFor="contract-phone">Telefone</FieldLabel>
                      <Input id="contract-phone" value={form.client_phone} disabled />
                    </Field>
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend>Informações complementares</FieldLegend>
                  <FieldGroup className="grid grid-cols-1 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="contract-email">E-mail</FieldLabel>
                      <Input
                        id="contract-email"
                        type="email"
                        value={form.client_email}
                        onChange={(e) => updateField('client_email', e.target.value)}
                        disabled={submitting}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="contract-marital">Estado civil *</FieldLabel>
                      <Select
                        value={form.marital_status === '' ? null : form.marital_status}
                        onValueChange={(value) => {
                          if (value === null) {
                            return
                          }

                          handleMaritalStatusChange(value)
                        }}
                        disabled={submitting}
                      >
                        <SelectTrigger id="contract-marital" className="w-full" aria-label="Estado civil *">
                          <SelectValue placeholder="Selecione">
                            {form.marital_status || null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {MARITAL_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {hasSpouse ? (
                        <FieldDescription>Preencha também a aba Cônjuge.</FieldDescription>
                      ) : null}
                    </Field>
                  </FieldGroup>
                  <FieldGroup className="grid grid-cols-1 sm:grid-cols-3">
                    <Field data-invalid={clientCpfInvalid ? true : undefined}>
                      <FieldLabel htmlFor="contract-cpf">CPF *</FieldLabel>
                      <Input
                        id="contract-cpf"
                        inputMode="numeric"
                        autoComplete="off"
                        aria-invalid={clientCpfInvalid ? true : undefined}
                        value={form.client_cpf}
                        onChange={(e) => updateField('client_cpf', formatCpf(e.target.value))}
                        disabled={submitting}
                      />
                      {clientCpfInvalid ? <FieldError>CPF inválido.</FieldError> : null}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="contract-rg">RG *</FieldLabel>
                      <Input
                        id="contract-rg"
                        value={form.client_rg}
                        onChange={(e) => updateField('client_rg', e.target.value.slice(0, 20))}
                        disabled={submitting}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="contract-nationality">Nacionalidade *</FieldLabel>
                      <Input
                        id="contract-nationality"
                        value={form.nationality}
                        onChange={(e) => updateField('nationality', e.target.value)}
                        disabled={submitting}
                      />
                    </Field>
                  </FieldGroup>
                  <FieldGroup className="grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)_5rem]">
                    <Field data-invalid={cepError ? true : undefined}>
                      <FieldLabel htmlFor="contract-zip">CEP *</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id="contract-zip"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          aria-invalid={cepError ? true : undefined}
                          value={form.zip}
                          onChange={(e) => handleZipChange(e.target.value)}
                          disabled={submitting}
                        />
                        {cepLoading ? (
                          <InputGroupAddon align="inline-end">
                            <LoaderCircleIcon className="animate-spin" />
                          </InputGroupAddon>
                        ) : null}
                      </InputGroup>
                      {cepError ? <FieldError>{cepError}</FieldError> : null}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="contract-city">Cidade *</FieldLabel>
                      <Input
                        id="contract-city"
                        value={form.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        disabled={submitting}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="contract-state">Estado *</FieldLabel>
                      <Input
                        id="contract-state"
                        value={form.state}
                        onChange={(e) => updateField('state', e.target.value.toUpperCase().slice(0, 2))}
                        disabled={submitting}
                      />
                    </Field>
                  </FieldGroup>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="contract-address">Endereço *</FieldLabel>
                      <Input
                        id="contract-address"
                        value={form.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        disabled={submitting}
                      />
                      <FieldDescription>Inclua o número após a consulta do CEP.</FieldDescription>
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </FieldGroup>
            </TabsContent>

            {hasSpouse ? (
              <TabsContent value="spouse" className="flex flex-col gap-5">
                <FieldGroup>
                  <FieldSet>
                    <FieldLegend>Dados do cônjuge</FieldLegend>
                    <FieldGroup className="grid grid-cols-1 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="spouse-name">Nome *</FieldLabel>
                        <Input
                          id="spouse-name"
                          value={form.spouse_name}
                          onChange={(e) => updateField('spouse_name', e.target.value)}
                          disabled={submitting}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="spouse-phone">Telefone</FieldLabel>
                        <Input
                          id="spouse-phone"
                          inputMode="tel"
                          autoComplete="tel"
                          value={form.spouse_phone}
                          onChange={(e) => updateField('spouse_phone', formatPhone(e.target.value))}
                          disabled={submitting}
                        />
                      </Field>
                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="spouse-email">E-mail</FieldLabel>
                        <Input
                          id="spouse-email"
                          type="email"
                          value={form.spouse_email}
                          onChange={(e) => updateField('spouse_email', e.target.value)}
                          disabled={submitting}
                        />
                      </Field>
                    </FieldGroup>
                    <FieldGroup className="grid grid-cols-1 sm:grid-cols-3">
                      <Field data-invalid={spouseCpfInvalid ? true : undefined}>
                        <FieldLabel htmlFor="spouse-cpf">CPF *</FieldLabel>
                        <Input
                          id="spouse-cpf"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-invalid={spouseCpfInvalid ? true : undefined}
                          value={form.spouse_cpf}
                          onChange={(e) => updateField('spouse_cpf', formatCpf(e.target.value))}
                          disabled={submitting}
                        />
                        {spouseCpfInvalid ? <FieldError>CPF inválido.</FieldError> : null}
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="spouse-rg">RG *</FieldLabel>
                        <Input
                          id="spouse-rg"
                          value={form.spouse_rg}
                          onChange={(e) => updateField('spouse_rg', e.target.value.slice(0, 20))}
                          disabled={submitting}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="spouse-nationality">Nacionalidade *</FieldLabel>
                        <Input
                          id="spouse-nationality"
                          value={form.spouse_nationality}
                          onChange={(e) => updateField('spouse_nationality', e.target.value)}
                          disabled={submitting}
                        />
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                </FieldGroup>
              </TabsContent>
            ) : null}
          </Tabs>

          <FieldGroup>
            <FieldSet>
              <FieldLegend>Documentação</FieldLegend>
              <FieldGroup>
                <Field>
                  <FieldLabel>Fotos dos documentos *</FieldLabel>
                  <FieldDescription>
                    {hasSpouse
                      ? 'RG, CPF ou CNH do cliente e do cônjuge. Anexe quantos arquivos precisar. Formatos aceitos: JPEG, PNG, WebP ou PDF (até 10MB cada).'
                      : 'RG, CPF ou CNH. Anexe quantos arquivos precisar. Formatos aceitos: JPEG, PNG, WebP ou PDF (até 10MB cada).'}
                  </FieldDescription>
                  <ReservationAttachmentField
                    files={files}
                    onFilesChange={setFiles}
                    multiple
                    disabled={submitting}
                    emptyLabel="Anexar documentos"
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" disabled={!canSubmit || submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Enviando...' : 'Enviar dados do contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
