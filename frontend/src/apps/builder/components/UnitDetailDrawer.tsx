import { useEffect, useState } from 'react'
import { defaultsFromBuilding } from '@/apps/builder/lib/building-form'
import { formatPrice } from '@/apps/builder/lib/format-price'
import {
  CEILING_OPTIONS,
  FLOORING_OPTIONS,
  OPENING_OPTIONS,
  PROPERTY_POSITION_OPTIONS,
  SOLAR_OPTIONS,
  SUN_PERIOD_OPTIONS,
  emptyBuildingDefaults,
  optionLabel,
} from '@/apps/builder/lib/unit-spec'
import {
  emptyUnitSpecForm,
  unitSpecFromUnit,
  unitSpecPayload,
  type UnitSpecForm,
} from '@/apps/builder/lib/unit-spec-form'
import { UnitSpecFields } from '@/apps/builder/components/UnitSpecFields'
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
import { builderApi, type Amenity, type Building, type Tower, type Unit } from '@/lib/api'

type UnitDetailDrawerProps = {
  unit: Unit | null
  buildingId: number
  buildingName: string
  towers: Tower[]
  building?: Building | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
  canUpdateStatus: boolean
  onSaved: (unit: Unit) => void
}

type IdentityForm = {
  code: string
  tower_id: string
  floor: string
  status: UnitStatus
}

function toIdentity(unit: Unit): IdentityForm {
  return {
    code: unit.code,
    tower_id: String(unit.tower_id ?? unit.tower?.id ?? ''),
    floor: unit.floor != null ? String(unit.floor) : '',
    status: unit.status as UnitStatus,
  }
}

function specLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
): string {
  return optionLabel(options, value) ?? '—'
}

export function UnitDetailDrawer({
  unit,
  buildingId,
  buildingName,
  towers,
  building = null,
  open,
  onOpenChange,
  canManage,
  canUpdateStatus,
  onSaved,
}: UnitDetailDrawerProps) {
  const canEdit = canManage || canUpdateStatus
  const statusOnly = !canManage && canUpdateStatus
  const buildingAmenityIds = (building?.amenities ?? unit?.inherited_amenities ?? []).map((item) => item.id)
  const defaults = building ? defaultsFromBuilding(building) : emptyBuildingDefaults()

  const [editing, setEditing] = useState(false)
  const [identity, setIdentity] = useState<IdentityForm | null>(unit ? toIdentity(unit) : null)
  const [spec, setSpec] = useState<UnitSpecForm>(() => (unit ? unitSpecFromUnit(unit) : emptyUnitSpecForm()))
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && unit) {
      setIdentity(toIdentity(unit))
      setSpec(unitSpecFromUnit(unit))
      setEditing(false)
      setError(null)
    }
  }, [open, unit])

  useEffect(() => {
    if (!open) {
      return
    }

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
  }, [open])

  const status = unit?.status as UnitStatus | undefined
  const statusLabel = status ? (unitStatusLabels[status] ?? unit.status) : ''
  const statusColor = status ? unitStatusColors[status] : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!unit || !identity) {
      return
    }

    setSaving(true)
    setError(null)

    const payload: Partial<Unit> & { amenity_ids?: number[] } = statusOnly
      ? { status: identity.status }
      : {
          code: identity.code,
          tower_id: Number(identity.tower_id),
          floor: identity.floor ? Number(identity.floor) : null,
          status: identity.status,
          ...unitSpecPayload(spec),
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
    <Drawer open={open} onOpenChange={onOpenChange} direction="right" handleOnly>
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
        <DrawerHeader>
          <DrawerTitle>{unit?.code ?? 'Unidade'}</DrawerTitle>
          <DrawerDescription>{buildingName}</DrawerDescription>
        </DrawerHeader>

        {unit && identity ? (
          editing ? (
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {!statusOnly ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="unit-code">Código</Label>
                    <Input
                      id="unit-code"
                      value={identity.code}
                      onChange={(e) => setIdentity({ ...identity, code: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="unit-tower">Torre</Label>
                    <select
                      id="unit-tower"
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={identity.tower_id}
                      onChange={(e) => setIdentity({ ...identity, tower_id: e.target.value })}
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

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="unit-floor">Andar</Label>
                    <Input
                      id="unit-floor"
                      type="number"
                      min={0}
                      value={identity.floor}
                      onChange={(e) => setIdentity({ ...identity, floor: e.target.value })}
                    />
                  </div>

                  <UnitSpecFields
                    idPrefix="unit-spec"
                    spec={spec}
                    amenities={amenities}
                    buildingAmenityIds={buildingAmenityIds}
                    defaults={defaults}
                    onChange={setSpec}
                  />
                </>
              ) : null}

              {canManage || canUpdateStatus ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="unit-status">Status</Label>
                  <select
                    id="unit-status"
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={identity.status}
                    onChange={(e) =>
                      setIdentity({ ...identity, status: e.target.value as UnitStatus })
                    }
                  >
                    {unitStatusLegend.map(({ status: item, label }) => (
                      <option key={item} value={item}>
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
                    setIdentity(toIdentity(unit))
                    setSpec(unitSpecFromUnit(unit))
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
              <dl className="grid gap-4 overflow-y-auto px-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Torre</dt>
                  <dd className="font-medium">{unit.tower?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Andar</dt>
                  <dd className="font-medium">{unit.floor ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Área privativa</dt>
                  <dd className="font-medium">
                    {unit.private_area_m2 ?? unit.area_m2 ? `${unit.private_area_m2 ?? unit.area_m2} m²` : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Área total</dt>
                  <dd className="font-medium">{unit.total_area_m2 ? `${unit.total_area_m2} m²` : '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Preço (INCC-M)</dt>
                  <dd className="font-medium">{formatPrice(unit.price)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Preço-base</dt>
                  <dd className="font-medium">{formatPrice(unit.price_base ?? null)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Competência</dt>
                  <dd className="font-medium">{unit.price_competence?.slice(0, 10) || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Quartos</dt>
                  <dd className="font-medium">{unit.bedrooms ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Posição</dt>
                  <dd className="font-medium">{specLabel(PROPERTY_POSITION_OPTIONS, unit.property_position)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Forro</dt>
                  <dd className="font-medium">{specLabel(CEILING_OPTIONS, unit.ceiling_type)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Aberturas</dt>
                  <dd className="font-medium">{specLabel(OPENING_OPTIONS, unit.opening_type)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Piso</dt>
                  <dd className="font-medium">{specLabel(FLOORING_OPTIONS, unit.flooring_type)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Sol</dt>
                  <dd className="font-medium">
                    {[specLabel(SOLAR_OPTIONS, unit.solar_position), specLabel(SUN_PERIOD_OPTIONS, unit.sun_period)]
                      .filter((item) => item !== '—')
                      .join(' · ') || '—'}
                  </dd>
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
