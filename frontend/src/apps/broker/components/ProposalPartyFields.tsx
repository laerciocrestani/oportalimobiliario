import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
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
  const cepRequestRef = useRef<AbortController | null>(null)
  const formRef = useRef(form)
  formRef.current = form
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

  function update(patch: Partial<ProposalPartyForm>) {
    onChange({ ...form, ...patch })
  }

  async function fillAddress(zip: string) {
    cepRequestRef.current?.abort()
    const controller = new AbortController()
    cepRequestRef.current = controller
    setCepError(null)

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
    }
  }

  const nameLabel = company ? 'Razão social' : 'Nome'

  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      <legend className="text-base font-semibold">Dados do comprador</legend>
      <p className="text-sm text-muted-foreground">
        Informe os dados para identificar o comprador na proposta.
      </p>
      <div className="flex flex-col gap-4 rounded-lg border bg-muted p-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Tipo de comprador</p>
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
          <Label htmlFor="buyer-name">{nameLabel}</Label>
          <Input
            id="buyer-name"
            aria-label={nameLabel}
            autoComplete="name"
            value={contact.name}
            onChange={(event) => onContactChange({ ...contact, name: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="buyer-phone">Telefone</Label>
          <Input
            id="buyer-phone"
            aria-label="Telefone"
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

        <div className="space-y-1">
          <Label htmlFor="party-document">{documentLabel}</Label>
        <Input
          id="party-document"
          aria-label={documentLabel}
          inputMode="numeric"
          autoComplete="off"
          placeholder={company ? '00.000.000/0000-00' : '000.000.000-00'}
          aria-invalid={documentInvalid || undefined}
          value={form.document}
          onBlur={() => setDocumentTouched(true)}
          onChange={(event) => update({
            document: company ? formatCnpj(event.target.value) : formatCpf(event.target.value),
          })}
        />
        {documentInvalid ? (
          <p className="text-xs text-destructive">{company ? 'CNPJ inválido.' : 'CPF inválido.'}</p>
        ) : null}
      </div>

      {form.kind === 'individual' ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="party-rg">RG</Label>
            <Input id="party-rg" aria-label="RG" value={form.rg} onChange={(event) => update({ rg: event.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="party-marital">Estado civil</Label>
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
              <SelectTrigger id="party-marital" className="w-full" aria-label="Estado civil">
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
            <Label htmlFor="party-nationality">Nacionalidade</Label>
            <Input
              id="party-nationality"
              aria-label="Nacionalidade"
              value={form.nationality}
              onChange={(event) => update({ nationality: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="party-profession">Profissão</Label>
            <Input
              id="party-profession"
              aria-label="Profissão"
              value={form.profession}
              onChange={(event) => update({ profession: event.target.value })}
            />
          </div>
          {form.maritalStatus === MARRIED_STATUS ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="spouse-name">Nome do cônjuge</Label>
                <Input
                  id="spouse-name"
                  aria-label="Nome do cônjuge"
                  value={form.spouseName}
                  onChange={(event) => update({ spouseName: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="spouse-cpf">CPF do cônjuge</Label>
                <Input
                  id="spouse-cpf"
                  aria-label="CPF do cônjuge"
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
          <Label htmlFor="party-zip">CEP</Label>
          <Input
            id="party-zip"
            aria-label="CEP"
            value={form.zip}
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
          <Label htmlFor="party-city">Cidade</Label>
          <Input
            id="party-city"
            aria-label="Cidade"
            value={form.city}
            onChange={(event) => update({ city: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="party-state">UF</Label>
          <Input
            id="party-state"
            aria-label="UF"
            maxLength={2}
            value={form.state}
            onChange={(event) => update({ state: event.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-1 sm:col-span-3">
          <Label htmlFor="party-address">Endereço</Label>
          <Input
            id="party-address"
            aria-label="Endereço"
            value={form.address}
            onChange={(event) => update({ address: event.target.value })}
          />
        </div>
      </div>
      </div>
    </fieldset>
  )
}
