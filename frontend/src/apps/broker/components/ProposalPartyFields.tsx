import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cnpjDigits, cpfDigits, formatCnpj, formatCpf, isValidCnpj, isValidCpf } from '@/lib/br-docs'
import { formatCep, lookupCep } from '@/lib/viacep'
import {
  MARITAL_STATUS_OPTIONS,
  MARRIED_STATUS,
  type ProposalPartyForm,
} from '@/apps/broker/lib/proposal-party'

type ProposalPartyFieldsProps = {
  form: ProposalPartyForm
  disabled?: boolean
  onChange: (form: ProposalPartyForm) => void
}

export function ProposalPartyFields({ form, disabled = false, onChange }: ProposalPartyFieldsProps) {
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

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="text-sm font-medium">Comprador</legend>
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="party-kind"
            value="individual"
            checked={form.kind === 'individual'}
            onChange={() => {
              setDocumentTouched(false)
              update({ kind: 'individual', document: '' })
            }}
          />
          Pessoa física
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="party-kind"
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
          Pessoa jurídica
        </label>
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
            <select
              id="party-marital"
              aria-label="Estado civil"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={form.maritalStatus}
              onChange={(event) => update({
                maritalStatus: event.target.value,
                ...(event.target.value === MARRIED_STATUS ? {} : { spouseName: '', spouseCpf: '' }),
              })}
            >
              <option value="">Selecione</option>
              {MARITAL_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
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
        <Label htmlFor="party-address">Endereço</Label>
        <Input
          id="party-address"
          aria-label="Endereço"
          value={form.address}
          onChange={(event) => update({ address: event.target.value })}
        />
      </div>
      <div className="grid grid-cols-[1fr_4rem] gap-2">
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
      </div>
    </fieldset>
  )
}
