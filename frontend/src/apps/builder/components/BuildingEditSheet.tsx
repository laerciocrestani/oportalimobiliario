import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { builderApi, type Building } from '@/lib/api'

type BuildingEditSheetProps = {
  building: Building
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function BuildingEditSheet({
  building,
  open,
  onOpenChange,
  onSaved,
}: BuildingEditSheetProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(building))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(toFormState(building))
      setError(null)
    }
  }, [open, building])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

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
      onOpenChange(false)
    } catch {
      setError('Não foi possível salvar o empreendimento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar empreendimento</SheetTitle>
          <SheetDescription>Atualize os dados do empreendimento.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

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
              onCheckedChange={(checked) =>
                setForm({ ...form, published: checked === true })
              }
            />
            Publicado
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

          <SheetFooter className="px-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
