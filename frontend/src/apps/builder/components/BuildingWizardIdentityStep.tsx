import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type BuildingIdentityForm = {
  name: string
  zip: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export const emptyIdentityForm: BuildingIdentityForm = {
  name: '',
  zip: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
}

export function zipDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8)
}

export function formatZip(digits: string): string {
  if (digits.length <= 5) {
    return digits
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

type BuildingWizardIdentityStepProps = {
  form: BuildingIdentityForm
  onChange: (form: BuildingIdentityForm) => void
  onLookupCep: () => void
  lookingUpCep: boolean
  cepHint: string | null
}

export function BuildingWizardIdentityStep({
  form,
  onChange,
  onLookupCep,
  lookingUpCep,
  cepHint,
}: BuildingWizardIdentityStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wizard-building-name">Nome do empreendimento</Label>
        <Input
          id="wizard-building-name"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="wizard-building-zip">CEP</Label>
          <Input
            id="wizard-building-zip"
            inputMode="numeric"
            placeholder="00000-000"
            value={formatZip(form.zip)}
            onChange={(e) => onChange({ ...form, zip: zipDigits(e.target.value) })}
          />
        </div>
        <Button type="button" variant="outline" onClick={onLookupCep} disabled={lookingUpCep || form.zip.length !== 8}>
          {lookingUpCep ? 'Buscando...' : 'Buscar CEP'}
        </Button>
      </div>
      {cepHint ? <p className="text-sm text-muted-foreground">{cepHint}</p> : null}

      <div className="space-y-2">
        <Label htmlFor="wizard-building-street">Logradouro</Label>
        <Input
          id="wizard-building-street"
          value={form.street}
          onChange={(e) => onChange({ ...form, street: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="wizard-building-number">Número</Label>
          <Input
            id="wizard-building-number"
            value={form.number}
            onChange={(e) => onChange({ ...form, number: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="wizard-building-complement">Complemento</Label>
          <Input
            id="wizard-building-complement"
            value={form.complement}
            onChange={(e) => onChange({ ...form, complement: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wizard-building-neighborhood">Bairro</Label>
        <Input
          id="wizard-building-neighborhood"
          value={form.neighborhood}
          onChange={(e) => onChange({ ...form, neighborhood: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="wizard-building-city">Cidade</Label>
          <Input
            id="wizard-building-city"
            value={form.city}
            onChange={(e) => onChange({ ...form, city: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wizard-building-state">UF</Label>
          <Input
            id="wizard-building-state"
            value={form.state}
            maxLength={2}
            placeholder="SP"
            onChange={(e) => onChange({ ...form, state: e.target.value.toUpperCase() })}
          />
        </div>
      </div>
    </div>
  )
}
