import { useEffect, useState } from 'react'
import { UnitSpecFields } from '@/apps/builder/components/UnitSpecFields'
import { defaultsFromBuilding } from '@/apps/builder/lib/building-form'
import { emptyBuildingDefaults } from '@/apps/builder/lib/unit-spec'
import { emptyUnitSpecForm, unitSpecPayload, type UnitSpecForm } from '@/apps/builder/lib/unit-spec-form'
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
import { builderApi, type Amenity, type Building, type Tower, type Unit } from '@/lib/api'

type UnitCreateDialogProps = {
  buildingId: number
  towers: Tower[]
  building?: Building | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (unit: Unit) => void
  canManageBuildings?: boolean
}

type IdentityForm = {
  code: string
  tower_id: string
  floor: string
  status: UnitStatus
}

function initialIdentity(towers: Tower[]): IdentityForm {
  return {
    code: '',
    tower_id: towers.length === 1 ? String(towers[0].id) : '',
    floor: '',
    status: 'available',
  }
}

export function UnitCreateDialog({
  buildingId,
  towers,
  building = null,
  open,
  onOpenChange,
  onCreated,
  canManageBuildings = false,
}: UnitCreateDialogProps) {
  const hasTowers = towers.length > 0
  const [identity, setIdentity] = useState<IdentityForm>(() => initialIdentity(towers))
  const [spec, setSpec] = useState<UnitSpecForm>(() => emptyUnitSpecForm())
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const buildingAmenityIds = (building?.amenities ?? []).map((item) => item.id)
  const defaults = building ? defaultsFromBuilding(building) : emptyBuildingDefaults()

  useEffect(() => {
    if (open) {
      setIdentity(initialIdentity(towers))
      setSpec(emptyUnitSpecForm())
      setError(null)
    }
  }, [open, towers])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!hasTowers) {
      return
    }

    setSaving(true)
    setError(null)

    const payload: Partial<Unit> & { amenity_ids?: number[] } = {
      code: identity.code,
      tower_id: Number(identity.tower_id),
      floor: identity.floor ? Number(identity.floor) : null,
      status: identity.status,
      ...unitSpecPayload(spec),
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
      <DialogContent className="sm:max-w-lg">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-unit-code">Código</Label>
            <Input
              id="create-unit-code"
              value={identity.code}
              onChange={(e) => setIdentity({ ...identity, code: e.target.value })}
              required
              disabled={!hasTowers}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-unit-tower">Torre</Label>
            <select
              id="create-unit-tower"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              value={identity.tower_id}
              onChange={(e) => setIdentity({ ...identity, tower_id: e.target.value })}
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-unit-floor">Andar</Label>
            <Input
              id="create-unit-floor"
              type="number"
              min={0}
              value={identity.floor}
              onChange={(e) => setIdentity({ ...identity, floor: e.target.value })}
              disabled={!hasTowers}
            />
          </div>

          <UnitSpecFields
            idPrefix="create-unit-spec"
            spec={spec}
            amenities={amenities}
            buildingAmenityIds={buildingAmenityIds}
            defaults={defaults}
            disabled={!hasTowers}
            onChange={setSpec}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-unit-status">Status</Label>
            <select
              id="create-unit-status"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              value={identity.status}
              onChange={(e) =>
                setIdentity({ ...identity, status: e.target.value as UnitStatus })
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
