import { useEffect, useState } from 'react'
import { formatPrice } from '@/apps/builder/lib/format-price'
import {
  unitStatusColors,
  unitStatusLabels,
  unitStatusLegend,
  type UnitStatus,
} from '@/apps/builder/lib/unit-status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { builderApi, type Tower, type Unit } from '@/lib/api'

type UnitDetailDrawerProps = {
  unit: Unit | null
  buildingId: number
  buildingName: string
  towers: Tower[]
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
  canUpdateStatus: boolean
  onSaved: (unit: Unit) => void
}

type FormState = {
  code: string
  tower_id: string
  floor: string
  area_m2: string
  price: string
  status: UnitStatus
}

function toFormState(unit: Unit): FormState {
  return {
    code: unit.code,
    tower_id: String(unit.tower_id ?? unit.tower?.id ?? ''),
    floor: unit.floor != null ? String(unit.floor) : '',
    area_m2: unit.area_m2 ?? '',
    price: unit.price ?? '',
    status: unit.status as UnitStatus,
  }
}

export function UnitDetailDrawer({
  unit,
  buildingId,
  buildingName,
  towers,
  open,
  onOpenChange,
  canManage,
  canUpdateStatus,
  onSaved,
}: UnitDetailDrawerProps) {
  const canEdit = canManage || canUpdateStatus
  const statusOnly = !canManage && canUpdateStatus

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(unit ? toFormState(unit) : null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && unit) {
      setForm(toFormState(unit))
      setEditing(false)
      setError(null)
    }
  }, [open, unit])

  const status = unit?.status as UnitStatus | undefined
  const statusLabel = status ? (unitStatusLabels[status] ?? unit.status) : ''
  const statusColor = status ? unitStatusColors[status] : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!unit || !form) {
      return
    }

    setSaving(true)
    setError(null)

    const payload: Partial<Unit> = statusOnly
      ? { status: form.status }
      : {
          code: form.code,
          tower_id: Number(form.tower_id),
          floor: form.floor ? Number(form.floor) : null,
          area_m2: form.area_m2 || null,
          price: form.price || null,
          status: form.status,
        }

    try {
      const updated = await builderApi.updateUnit(buildingId, unit.id, payload)
      onSaved(updated)
      setEditing(false)
    } catch {
      setError('Não foi possível salvar a unidade.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>{unit?.code ?? 'Unidade'}</DrawerTitle>
          <DrawerDescription>{buildingName}</DrawerDescription>
        </DrawerHeader>

        {unit && form ? (
          editing ? (
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {!statusOnly ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="unit-code">Código</Label>
                    <Input
                      id="unit-code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit-tower">Torre</Label>
                    <select
                      id="unit-tower"
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={form.tower_id}
                      onChange={(e) => setForm({ ...form, tower_id: e.target.value })}
                      required
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
                    <Label htmlFor="unit-floor">Andar</Label>
                    <Input
                      id="unit-floor"
                      type="number"
                      min={0}
                      value={form.floor}
                      onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit-area">Área (m²)</Label>
                    <Input
                      id="unit-area"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.area_m2}
                      onChange={(e) => setForm({ ...form, area_m2: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit-price">Preço</Label>
                    <Input
                      id="unit-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                </>
              ) : null}

              {(canManage || canUpdateStatus) ? (
                <div className="space-y-2">
                  <Label htmlFor="unit-status">Status</Label>
                  <select
                    id="unit-status"
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as UnitStatus })
                    }
                  >
                    {unitStatusLegend.map(({ status, label }) => (
                      <option key={status} value={status}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <DrawerFooter className="px-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(false)
                    setForm(toFormState(unit))
                    setError(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </DrawerFooter>
            </form>
          ) : (
            <>
              <dl className="grid gap-4 px-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Torre</dt>
                  <dd className="font-medium">{unit.tower?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Andar</dt>
                  <dd className="font-medium">{unit.floor ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Área</dt>
                  <dd className="font-medium">{unit.area_m2 ? `${unit.area_m2} m²` : '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Preço</dt>
                  <dd className="font-medium">{formatPrice(unit.price)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge className={`border-transparent text-white ${statusColor}`}>
                      {statusLabel}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Empreendimento</dt>
                  <dd className="text-right font-medium">{buildingName}</dd>
                </div>
              </dl>

              {canEdit ? (
                <DrawerFooter>
                  <Button type="button" onClick={() => setEditing(true)}>
                    Editar
                  </Button>
                </DrawerFooter>
              ) : null}
            </>
          )
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
