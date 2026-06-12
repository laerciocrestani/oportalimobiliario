import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { builderApi, type Building } from '@/lib/api'

type BuildingEditFormProps = {
  building: Building
  onSaved: (building: Building) => void
}

type FormState = {
  name: string
  description: string
  city: string
  state: string
  published: boolean
  seo_title: string
  seo_description: string
}

function toFormState(building: Building): FormState {
  return {
    name: building.name,
    description: building.description ?? '',
    city: building.city ?? '',
    state: building.state ?? '',
    published: building.published,
    seo_title: building.seo_title ?? '',
    seo_description: building.seo_description ?? '',
  }
}

export function BuildingEditForm({ building, onSaved }: BuildingEditFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(building))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await builderApi.updateBuilding(building.id, {
        name: form.name,
        description: form.description || null,
        city: form.city || null,
        state: form.state || null,
        published: form.published,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="text-base font-semibold">Dados do empreendimento</h2>
        <p className="text-sm text-muted-foreground">Informações gerais e SEO.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}

      <div className="space-y-2">
        <Label htmlFor="building-name">Nome</Label>
        <Input
          id="building-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="building-description">Descrição</Label>
        <textarea
          id="building-description"
          className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="building-city">Cidade</Label>
          <Input
            id="building-city"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="building-state">UF</Label>
          <Input
            id="building-state"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
            maxLength={2}
            placeholder="SP"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.published}
          onCheckedChange={(checked) => setForm({ ...form, published: checked === true })}
        />
        Empreendimento publicado no portal
      </label>

      <div className="space-y-2">
        <Label htmlFor="building-seo-title">Título SEO</Label>
        <Input
          id="building-seo-title"
          value={form.seo_title}
          onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="building-seo-description">Descrição SEO</Label>
        <textarea
          id="building-seo-description"
          className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={form.seo_description}
          onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
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
