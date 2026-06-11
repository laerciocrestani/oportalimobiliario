import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { builderApi, type Tower } from '@/lib/api'

type TowerEditSheetProps = {
  buildingId: number
  tower: Tower | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (tower: Tower) => void
}

type FormState = {
  name: string
  sort_order: string
}

function toFormState(tower: Tower | null): FormState {
  return {
    name: tower?.name ?? '',
    sort_order: tower?.sort_order != null ? String(tower.sort_order) : '0',
  }
}

export function TowerEditSheet({
  buildingId,
  tower,
  open,
  onOpenChange,
  onSaved,
}: TowerEditSheetProps) {
  const isNew = tower === null
  const [form, setForm] = useState<FormState>(() => toFormState(tower))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(toFormState(tower))
      setError(null)
    }
  }, [open, tower])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name,
      sort_order: Number(form.sort_order) || 0,
    }

    try {
      const saved = isNew
        ? await builderApi.createTower(buildingId, payload)
        : await builderApi.updateTower(buildingId, tower.id, payload)
      onSaved(saved)
      onOpenChange(false)
    } catch {
      setError(isNew ? 'Não foi possível criar a torre.' : 'Não foi possível salvar a torre.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isNew ? 'Nova torre' : 'Editar torre'}</SheetTitle>
          <SheetDescription>
            {isNew ? 'Cadastre uma nova torre no empreendimento.' : 'Atualize os dados da torre.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="space-y-2">
            <Label htmlFor="tower-name">Nome</Label>
            <Input
              id="tower-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tower-sort-order">Ordem de exibição</Label>
            <Input
              id="tower-sort-order"
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
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
