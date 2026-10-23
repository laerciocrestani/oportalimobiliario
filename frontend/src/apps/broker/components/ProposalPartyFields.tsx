import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { ContactRoundIcon, UsersIcon } from 'lucide-react'
import { ProposalSectionTitle } from '@/apps/broker/components/ProposalSectionTitle'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cnpjDigits, cpfDigits, formatCnpj, formatCpf, isValidCnpj, isValidCpf } from '@/lib/br-docs'
import { brokerApi } from '@/lib/api'
import { formatBrazilianMobilePhone } from '@/lib/format-phone'
import { formatCep, lookupCep } from '@/lib/viacep'
import { cn } from '@/lib/utils'
import {
  MARITAL_STATUS_OPTIONS,
  MARRIED_STATUS,
  type ProposalPartyForm,
} from '@/apps/broker/lib/proposal-party'

export type ProposalContact = {
  name: string
  phone: string
  email: string
}

type ProposalPartyFieldsProps = {
  form: ProposalPartyForm
  contact: ProposalContact
  disabled?: boolean
  onChange: (form: ProposalPartyForm) => void
  onContactChange: (contact: ProposalContact) => void
}

export function ProposalPartyFields({
  form,
  contact,
  disabled = false,
  onChange,
  onContactChange,
}: ProposalPartyFieldsProps) {
  const [cepError, setCepError] = useState<string | null>(null)
  const [documentTouched, setDocumentTouched] = useState(false)
  const [spouseTouched, setSpouseTouched] = useState(false)
  const [lookupNote, setLookupNote] = useState<string | null>(null)
  const [documentLooking, setDocumentLooking] = useState(false)
  const [cepLooking, setCepLooking] = useState(false)
  const cepRequestRef = useRef<AbortController | null>(null)
  const formRef = useRef(form)
  const onChangeRef = useRef(onChange)
  const onContactChangeRef = useRef(onContactChange)
  const lookedUpRef = useRef('')
  formRef.current = form
  onChangeRef.current = onChange
  onContactChangeRef.current = onContactChange
  const company = form.kind === 'company'
  const documentLabel = company ? 'CNPJ' : 'CPF'
  const documentDigits = company ? cnpjDigits(form.document) : cpfDigits(form.document)
  const documentValid = company ? isValidCnpj(form.document) : isValidCpf(form.document)
  const documentInvalid = form.document !== ''
    && !documentValid
    && (documentTouched || documentDigits.length === (company ? 14 : 11))
  const spouseDigits = cpfDigits(form.spouseCpf)
  const spouseInvalid = form.spouseCpf !== ''
    && !isValidCpf(form.spouseCpf)
    && (spouseTouched || spouseDigits.length === 11)

  useEffect(() => {
    return () => {
      cepRequestRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!documentValid) {
      lookedUpRef.current = ''
      setLookupNote(null)
      setDocumentLooking(false)
      return
    }

    if (lookedUpRef.current === documentDigits) {
      return
    }

    const controller = new AbortController()
    let active = true
    setDocumentLooking(true)

    void brokerApi.lookupBuyer(documentDigits, controller.signal)
      .then((buyer) => {
        if (!active) {
          return
        }

        lookedUpRef.current = documentDigits

        if (buyer === null) {
          setLookupNote(null)
          return
        }

        const companyBuyer = buyer.party_kind === 'company'
        onChangeRef.current({
          ...formRef.current,
          kind: companyBuyer ? 'company' : 'individual',
          document: companyBuyer ? formatCnpj(buyer.client_cpf) : formatCpf(buyer.client_cpf),
          rg: buyer.client_rg ?? '',
          maritalStatus: buyer.marital_status ?? '',
          nationality: buyer.nationality?.trim() || 'brasileira',
          profession: buyer.profession ?? '',
          zip: formatCep(buyer.zip ?? ''),
          address: buyer.address ?? '',
          city: buyer.city ?? '',
          state: (buyer.state ?? '').toUpperCase(),
          spouseName: buyer.spouse_name ?? '',
          spouseCpf: buyer.spouse_cpf ? formatCpf(buyer.spouse_cpf) : '',
        })
        onContactChangeRef.current({
          name: buyer.client_name,
          phone: formatBrazilianMobilePhone(buyer.client_phone),
          email: buyer.client_email ?? '',
        })
        setLookupNote('Cadastro encontrado. Os dados foram preenchidos.')
      })
      .catch(() => {
        if (active) {
          setLookupNote(null)
        }
      })
      .finally(() => {
        if (active) {
          setDocumentLooking(false)
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [documentDigits, documentValid])

  function update(patch: Partial<ProposalPartyForm>) {
    onChange({ ...form, ...patch })
  }

  async function fillAddress(zip: string) {
    cepRequestRef.current?.abort()
    const controller = new AbortController()
    cepRequestRef.current = controller
    setCepError(null)
    setCepLooking(true)

    try {
      const result = await lookupCep(zip, controller.signal)
      if (controller.signal.aborted || result === null) {
        return
      }

      const current = formRef.current
      onChange({
        ...current,
        zip: formatCep(zip),
        address: result.address || current.address,
        city: result.city || current.city,
        state: result.state || current.state,
      })
    } catch {
      if (!controller.signal.aborted) {
        setCepError('Não foi possível consultar o CEP.')
      }
    } finally {
      if (cepRequestRef.current === controller) {
        setCepLooking(false)
      }
    }
  }

  const nameLabel = company ? 'Razão social' : 'Nome'

  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      <legend className="mb-4 w-full">
        <ProposalSectionTitle
          icon={ContactRoundIcon}
          description="Informe os dados para identificar o comprador na proposta."
        >
          Dados do comprador
        </ProposalSectionTitle>
      </legend>
      <div className="flex flex-col gap-4 rounded-lg border bg-muted p-4">
      <div className="flex flex-col gap-2">
        <ProposalSectionTitle icon={UsersIcon}>Tipo de comprador</ProposalSectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm',
              form.kind === 'individual'
                ? 'border-primary bg-primary/10 dark:bg-primary/15'
                : 'border-input bg-background',
            )}
          >
            <input
              type="radio"
              name="party-kind"
              className="accent-primary"
              value="individual"
              checked={form.kind === 'individual'}
              onChange={() => {
                setDocumentTouched(false)
                update({ kind: 'individual', document: '' })
              }}
            />
            Pessoa física (PF)
          </label>
          <label
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm',
              form.kind === 'company'
                ? 'border-primary bg-primary/10 dark:bg-primary/15'
                : 'border-input bg-background',
            )}
          >
            <input
              type="radio"
              name="party-kind"
              className="accent-primary"
              value="company"
              checked={form.kind === 'company'}
              onChange={() => {
                setDocumentTouched(false)
                update({
                  kind: 'company',
                  document: '',
                  rg: '',
                  maritalStatus: '',
                  profession: '',
                  spouseName: '',
                  spouseCpf: '',
                })
              }}
            />
            Pessoa jurídica (PJ)
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3 [&_input]:bg-background [&_[data-slot=select-trigger]]:bg-background">
        <div className="space-y-1">
          <RequiredLabel htmlFor="party-document">{documentLabel}</RequiredLabel>
          <LookupInput
            id="party-document"
            aria-label={documentLabel}
            inputMode="numeric"
            autoComplete="off"
            placeholder={company ? '00.000.000/0000-00' : '000.000.000-00'}
            aria-invalid={documentInvalid || undefined}
            aria-required="true"
            value={form.document}
            loading={documentLooking}
            loadingLabel={company ? 'Buscando CNPJ' : 'Buscando CPF'}
            onBlur={() => setDocumentTouched(true)}
            onChange={(event) => update({
              document: company ? formatCnpj(event.target.value) : formatCpf(event.target.value),
            })}
          />
          {documentInvalid ? (
            <p className="text-xs text-destructive">{company ? 'CNPJ inválido.' : 'CPF inválido.'}</p>
          ) : null}
          {lookupNote ? <p className="text-xs text-muted-foreground">{lookupNote}</p> : null}
        </div>
        <div className="space-y-1">
          <RequiredLabel htmlFor="buyer-name">{nameLabel}</RequiredLabel>
          <Input
            id="buyer-name"
            aria-label={nameLabel}
            aria-required="true"
            autoComplete="name"
            value={contact.name}
            onChange={(event) => onContactChange({ ...contact, name: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <RequiredLabel htmlFor="buyer-phone">Telefone</RequiredLabel>
          <Input
            id="buyer-phone"
            aria-label="Telefone"
            aria-required="true"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            value={contact.phone}
            onChange={(event) => onContactChange({
              ...contact,
              phone: formatBrazilianMobilePhone(event.target.value),
            })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="buyer-email">E-mail</Label>
          <Input
            id="buyer-email"
            aria-label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="nome@exemplo.com"
            value={contact.email}
            onChange={(event) => onContactChange({ ...contact, email: event.target.value })}
          />
        </div>

      {form.kind === 'individual' ? (
        <>
          <div className="space-y-1">
            <RequiredLabel htmlFor="party-rg">RG</RequiredLabel>
            <Input id="party-rg" aria-label="RG" aria-required="true" value={form.rg} onChange={(event) => update({ rg: event.target.value })} />
          </div>
          <div className="space-y-1">
            <RequiredLabel htmlFor="party-marital">Estado civil</RequiredLabel>
            <Select
              value={form.maritalStatus === '' ? null : form.maritalStatus}
              onValueChange={(next) => {
                if (next === null) {
                  return
                }

                update({
                  maritalStatus: next,
                  ...(next === MARRIED_STATUS ? {} : { spouseName: '', spouseCpf: '' }),
                })
              }}
            >
              <SelectTrigger id="party-marital" className="w-full" aria-label="Estado civil" aria-required="true">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {MARITAL_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <RequiredLabel htmlFor="party-nationality">Nacionalidade</RequiredLabel>
            <Input
              id="party-nationality"
              aria-label="Nacionalidade"
              aria-required="true"
              value={form.nationality}
              onChange={(event) => update({ nationality: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <RequiredLabel htmlFor="party-profession">Profissão</RequiredLabel>
            <Input
              id="party-profession"
              aria-label="Profissão"
              aria-required="true"
              value={form.profession}
              onChange={(event) => update({ profession: event.target.value })}
            />
          </div>
          {form.maritalStatus === MARRIED_STATUS ? (
            <>
              <div className="space-y-1">
                <RequiredLabel htmlFor="spouse-name">Nome do cônjuge</RequiredLabel>
                <Input
                  id="spouse-name"
                  aria-label="Nome do cônjuge"
                  aria-required="true"
                  value={form.spouseName}
                  onChange={(event) => update({ spouseName: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <RequiredLabel htmlFor="spouse-cpf">CPF do cônjuge</RequiredLabel>
                <Input
                  id="spouse-cpf"
                  aria-label="CPF do cônjuge"
                  aria-required="true"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  aria-invalid={spouseInvalid || undefined}
                  value={form.spouseCpf}
                  onBlur={() => setSpouseTouched(true)}
                  onChange={(event) => update({ spouseCpf: formatCpf(event.target.value) })}
                />
                {spouseInvalid ? <p className="text-xs text-destructive">CPF inválido.</p> : null}
              </div>
            </>
          ) : null}
        </>
      ) : null}

        <div className="space-y-1">
          <RequiredLabel htmlFor="party-zip">CEP</RequiredLabel>
          <LookupInput
            id="party-zip"
            aria-label="CEP"
            aria-required="true"
            value={form.zip}
            loading={cepLooking}
            loadingLabel="Buscando CEP"
            onChange={(event) => {
              const zip = formatCep(event.target.value)
              update({ zip })
              if (zip.replace(/\D/g, '').length === 8) {
                void fillAddress(zip)
              }
            }}
          />
          {cepError ? <p className="text-xs text-destructive">{cepError}</p> : null}
        </div>
        <div className="space-y-1">
          <RequiredLabel htmlFor="party-city">Cidade</RequiredLabel>
          <Input
            id="party-city"
            aria-label="Cidade"
            aria-required="true"
            value={form.city}
            onChange={(event) => update({ city: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <RequiredLabel htmlFor="party-state">UF</RequiredLabel>
          <Input
            id="party-state"
            aria-label="UF"
            aria-required="true"
            maxLength={2}
            value={form.state}
            onChange={(event) => update({ state: event.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-1 sm:col-span-3">
          <RequiredLabel htmlFor="party-address">Endereço</RequiredLabel>
          <Input
            id="party-address"
            aria-label="Endereço"
            aria-required="true"
            value={form.address}
            onChange={(event) => update({ address: event.target.value })}
          />
        </div>
      </div>
      </div>
    </fieldset>
  )
}

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return <Label htmlFor={htmlFor}>{children} *</Label>
}

function LookupInput({
  loading,
  loadingLabel,
  className,
  ...props
}: ComponentProps<typeof Input> & {
  loading: boolean
  loadingLabel: string
}) {
  return (
    <div className="relative">
      <Input className={cn(loading && 'pr-8', className)} {...props} />
      {loading ? (
        <Spinner
          aria-label={loadingLabel}
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
        />
      ) : null}
    </div>
  )
}
