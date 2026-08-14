import { useEffect, useState } from 'react'
import {
  unitStatusLegend,
  type UnitStatus,
} from '@/apps/builder/lib/unit-status'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { builderApi, type Tower, type Unit } from '@/lib/api'

type UnitCreateDialogProps = {
  buildingId: number
  towers: Tower[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (unit: Unit) => void
  canManageBuildings?: boolean
}

type FormState = {
  code: string
  tower_id: string
  floor: string
  area_m2: string
  price: string
  status: UnitStatus
}

function initialFormState(towers: Tower[]): FormState {
  return {
    code: '',
    tower_id: towers.length === 1 ? String(towers[0].id) : '',
    floor: '',
    area_m2: '',
    price: '',
    status: 'available',
  }
}

export function UnitCreateDialog({
  buildingId,
  towers,
  open,
  onOpenChange,
  onCreated,
  canManageBuildings = false,
}: UnitCreateDialogProps) {
  const hasTowers = towers.length > 0
  const [form, setForm] = useState<FormState>(() => initialFormState(towers))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(initialFormState(towers))
      setError(null)
    }
  }, [open, towers])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!hasTowers) {
      return
    }

    setSaving(true)
    setError(null)

    const payload: Partial<Unit> = {
      code: form.code,
      tower_id: Number(form.tower_id),
      floor: form.floor ? Number(form.floor) : null,
      area_m2: form.area_m2 || null,
      price: form.price || null,
      status: form.status,
    }

    try {
      const created = await builderApi.createUnit(buildingId, payload)
      onCreated(created)
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      setError(
        message.includes('422')
          ? 'Código já existe nesta torre ou dados inválidos.'
          : 'Não foi possível criar a unidade.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova unidade</DialogTitle>
          <DialogDescription>Cadastre uma nova unidade no empreendimento.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <DialogBody>
          {!hasTowers ? (
            <p className="text-sm text-muted-foreground">
              Cadastre uma torre antes de incluir unidades.
              {canManageBuildings ? ' Use a aba Torres para adicionar.' : ''}
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="space-y-2">
            <Label htmlFor="create-unit-code">Código</Label>
            <Input
              id="create-unit-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
              disabled={!hasTowers}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-unit-tower">Torre</Label>
            <select
              id="create-unit-tower"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              value={form.tower_id}
              onChange={(e) => setForm({ ...form, tower_id: e.target.value })}
              required
              disabled={!hasTowers}
            >
              <option value="" disabled>
                Selecione a torre
              </option>
              {towers.map((tower) => (
                <option key={tower.id} value={tower.id}>
                  {tower.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-unit-floor">Andar</Label>
            <Input
              id="create-unit-floor"
              type="number"
              min={0}
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
              disabled={!hasTowers}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-unit-area">Área (m²)</Label>
            <Input
              id="create-unit-area"
              type="number"
              min={0}
              step="0.01"
              value={form.area_m2}
              onChange={(e) => setForm({ ...form, area_m2: e.target.value })}
              disabled={!hasTowers}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-unit-price">Preço</Label>
            <Input
              id="create-unit-price"
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              disabled={!hasTowers}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-unit-status">Status</Label>
            <select
              id="create-unit-status"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as UnitStatus })
              }
              disabled={!hasTowers}
            >
              {unitStatusLegend.map(({ status, label }) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          </DialogBody>

          <DialogFooter>
            <Button type="submit" disabled={saving || !hasTowers}>
              {saving ? 'Salvando...' : 'Criar unidade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
