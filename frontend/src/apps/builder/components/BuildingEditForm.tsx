import { useEffect, useState } from 'react'
import { BuildingWizardDefaultsCard } from '@/apps/builder/components/BuildingWizardDefaultsCard'
import {
  BuildingWizardIdentityStep,
  type BuildingIdentityForm,
} from '@/apps/builder/components/BuildingWizardIdentityStep'
import {
  defaultsFromBuilding,
  defaultsUpdatePayload,
  identityFromBuilding,
  identityUpdatePayload,
} from '@/apps/builder/lib/building-form'
import { type BuildingDefaultsForm } from '@/apps/builder/lib/unit-spec'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiRequestError, builderApi, type Amenity, type Building } from '@/lib/api'

type BuildingEditFormProps = {
  building: Building
  onSaved: (building: Building) => void
}

type MetaForm = {
  description: string
  slug: string
  published: boolean
  seo_title: string
  seo_description: string
}

function metaFromBuilding(building: Building): MetaForm {
  return {
    description: building.description ?? '',
    slug: building.slug ?? '',
    published: building.published,
    seo_title: building.seo_title ?? '',
    seo_description: building.seo_description ?? '',
  }
}

export function BuildingEditForm({ building, onSaved }: BuildingEditFormProps) {
  const [identity, setIdentity] = useState<BuildingIdentityForm>(() => identityFromBuilding(building))
  const [defaults, setDefaults] = useState<BuildingDefaultsForm>(() => defaultsFromBuilding(building))
  const [meta, setMeta] = useState<MetaForm>(() => metaFromBuilding(building))
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [lookingUpCep, setLookingUpCep] = useState(false)
  const [cepHint, setCepHint] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setIdentity(identityFromBuilding(building))
    setDefaults(defaultsFromBuilding(building))
    setMeta(metaFromBuilding(building))
  }, [building])

  useEffect(() => {
    let cancelled = false

    builderApi
      .listAmenities()
      .then((items) => {
        if (!cancelled) {
          setAmenities(items)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAmenities([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleLookupCep() {
    if (identity.zip.length !== 8) {
      return
    }

    setLookingUpCep(true)
    setCepHint(null)

    try {
      const address = await builderApi.lookupCep(identity.zip)
      setIdentity((current) => ({
        ...current,
        street: address.street || current.street,
        neighborhood: address.neighborhood || current.neighborhood,
        city: address.city || current.city,
        state: address.state || current.state,
        complement: address.complement || current.complement,
      }))
      setCepHint('Endereço preenchido pelo CEP. Número e complemento podem ser ajustados.')
    } catch (err) {
      setCepHint(
        err instanceof ApiRequestError && err.status === 404
          ? 'CEP não encontrado. Preencha o endereço manualmente.'
          : 'Não foi possível consultar o CEP. Preencha o endereço manualmente.',
      )
    } finally {
      setLookingUpCep(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await builderApi.updateBuilding(building.id, {
        ...identityUpdatePayload(identity),
        ...defaultsUpdatePayload(defaults),
        description: meta.description || null,
        slug: meta.slug || null,
        published: meta.published,
        seo_title: meta.seo_title || null,
        seo_description: meta.seo_description || null,
      })
      onSaved(updated)
      setSuccess('Empreendimento salvo com sucesso.')
    } catch {
      setError('Não foi possível salvar o empreendimento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-lg border p-4">
      <div>
        <h2 className="text-base font-semibold">Dados do empreendimento</h2>
        <p className="text-sm text-muted-foreground">Endereço, padrão das unidades, publicação e SEO.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}

      <BuildingWizardIdentityStep
        form={identity}
        onChange={setIdentity}
        onLookupCep={() => void handleLookupCep()}
        lookingUpCep={lookingUpCep}
        cepHint={cepHint}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="building-description">Descrição</Label>
        <textarea
          id="building-description"
          className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={meta.description}
          onChange={(e) => setMeta({ ...meta, description: e.target.value })}
        />
      </div>

      <BuildingWizardDefaultsCard defaults={defaults} amenities={amenities} onChange={setDefaults} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="building-slug">Slug (URL pública)</Label>
        <Input
          id="building-slug"
          value={meta.slug}
          onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
          placeholder="residencial-aurora"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        />
        <p className="text-xs text-muted-foreground">
          Usado em /empreendimentos/{meta.slug || 'seu-slug'} no portal público.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={meta.published}
          onCheckedChange={(checked) => setMeta({ ...meta, published: checked === true })}
        />
        Empreendimento publicado no portal
      </label>

      <div className="flex flex-col gap-2">
        <Label htmlFor="building-seo-title">Título SEO</Label>
        <Input
          id="building-seo-title"
          value={meta.seo_title}
          onChange={(e) => setMeta({ ...meta, seo_title: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="building-seo-description">Descrição SEO</Label>
        <textarea
          id="building-seo-description"
          className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={meta.seo_description}
          onChange={(e) => setMeta({ ...meta, seo_description: e.target.value })}
          maxLength={500}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar dados'}
        </Button>
      </div>
    </form>
  )
}
