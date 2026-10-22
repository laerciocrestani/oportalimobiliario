import { type ReactNode } from 'react'
import { Building2Icon, CopyPlusIcon, LayersIcon, ListChecksIcon, SaveIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

export type BuildingIdentityForm = {
  name: string
  category: 'residential' | 'commercial' | 'mixed'
  priceMode: 'incc' | 'fixed'
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
  category: 'residential',
  priceMode: 'incc',
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
  priceModeLocked?: boolean
}

export function BuildingWizardIdentityStep({
  form,
  onChange,
  onLookupCep,
  lookingUpCep,
  cepHint,
  priceModeLocked = false,
}: BuildingWizardIdentityStepProps) {
  const addressFound = cepHint == null && form.zip.length === 8 && form.street.trim() !== ''

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Comece pelo empreendimento</h2>
          <p className="text-sm text-muted-foreground">
            Informe os dados de identificação e o endereço. Depois, organize os pavimentos.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">* Campos obrigatórios</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <FieldGroup className="gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Informações básicas</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="wizard-building-name">Nome do empreendimento *</FieldLabel>
                  <Input
                    id="wizard-building-name"
                    value={form.name}
                    onChange={(e) => onChange({ ...form, name: e.target.value })}
                    required
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="wizard-building-category">Tipo de empreendimento *</FieldLabel>
                    <select
                      id="wizard-building-category"
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                      value={form.category}
                      onChange={(event) =>
                        onChange({
                          ...form,
                          category: event.target.value as BuildingIdentityForm['category'],
                        })
                      }
                    >
                      <option value="residential">Residencial</option>
                      <option value="commercial">Comercial</option>
                      <option value="mixed">Misto</option>
                    </select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="wizard-building-organization">Organização da estrutura *</FieldLabel>
                    <Input id="wizard-building-organization" value="Torre única" readOnly />
                  </Field>
                </div>
                <FieldSet disabled={priceModeLocked}>
                  <legend className="text-sm font-medium">Valor das unidades</legend>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="wizard-price-mode"
                        value="incc"
                        checked={form.priceMode === 'incc'}
                        onChange={() => onChange({ ...form, priceMode: 'incc' })}
                      />
                      INCC
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="wizard-price-mode"
                        value="fixed"
                        checked={form.priceMode === 'fixed'}
                        onChange={() => onChange({ ...form, priceMode: 'fixed' })}
                      />
                      Valor fixo em reais
                    </label>
                  </div>
                  {priceModeLocked ? (
                    <p className="text-sm text-muted-foreground">
                      O modo de preço trava depois que uma unidade recebe valor.
                    </p>
                  ) : null}
                </FieldSet>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="flex flex-wrap items-end gap-4">
                  <Field className="w-52">
                    <FieldLabel htmlFor="wizard-building-zip">CEP *</FieldLabel>
                    <Input
                      id="wizard-building-zip"
                      inputMode="numeric"
                      placeholder="00000-000"
                      value={formatZip(form.zip)}
                      onChange={(e) => onChange({ ...form, zip: zipDigits(e.target.value) })}
                    />
                  </Field>
                  <Button type="button" variant="outline" onClick={onLookupCep} disabled={lookingUpCep || form.zip.length !== 8}>
                    {lookingUpCep ? 'Buscando...' : 'Buscar CEP'}
                  </Button>
                  {addressFound ? <p className="pb-2 text-xs text-emerald-700">Endereço encontrado</p> : null}
                </div>
                {cepHint ? <p className="text-sm text-muted-foreground">{cepHint}</p> : null}
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                  <Field>
                    <FieldLabel htmlFor="wizard-building-street">Logradouro *</FieldLabel>
                    <Input
                      id="wizard-building-street"
                      value={form.street}
                      onChange={(e) => onChange({ ...form, street: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="wizard-building-number">Número *</FieldLabel>
                    <Input
                      id="wizard-building-number"
                      value={form.number}
                      onChange={(e) => onChange({ ...form, number: e.target.value })}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="wizard-building-complement">Complemento</FieldLabel>
                  <Input
                    id="wizard-building-complement"
                    value={form.complement}
                    onChange={(e) => onChange({ ...form, complement: e.target.value })}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem]">
                  <Field>
                    <FieldLabel htmlFor="wizard-building-neighborhood">Bairro *</FieldLabel>
                    <Input
                      id="wizard-building-neighborhood"
                      value={form.neighborhood}
                      onChange={(e) => onChange({ ...form, neighborhood: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="wizard-building-city">Cidade *</FieldLabel>
                    <Input
                      id="wizard-building-city"
                      value={form.city}
                      onChange={(e) => onChange({ ...form, city: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="wizard-building-state">UF *</FieldLabel>
                    <Input
                      id="wizard-building-state"
                      value={form.state}
                      maxLength={2}
                      placeholder="SP"
                      onChange={(e) => onChange({ ...form, state: e.target.value.toUpperCase() })}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </FieldGroup>
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2Icon />
              </div>
              <CardTitle>Do endereço às unidades</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Uma estrutura organizada facilita a gestão do estoque no seu CRM.
              </p>
              <Separator />
              <GuideStep icon={<LayersIcon />} title="Crie um pavimento-modelo" text="Defina o tipo e adicione suas unidades." />
              <GuideStep icon={<CopyPlusIcon />} title="Replique em poucos passos" text="Clone para cima ou para baixo, com numeração automática." />
              <GuideStep icon={<ListChecksIcon />} title="Revise antes de cadastrar" text="Confira os pavimentos e os totais em um só lugar." />
            </CardContent>
          </Card>
          <div className="flex gap-2.5 rounded-md bg-muted p-3.5">
            <SaveIcon className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold">Você pode continuar depois</p>
              <p className="text-xs text-muted-foreground">
                Salve como rascunho a qualquer momento. Nenhuma unidade será publicada nesta etapa.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function GuideStep({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}
