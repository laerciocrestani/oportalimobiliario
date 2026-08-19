import { BuildingWizardEnumSelect } from '@/apps/builder/components/BuildingWizardEnumSelect'
import {
  CEILING_OPTIONS,
  FLOORING_OPTIONS,
  OPENING_OPTIONS,
  PROPERTY_POSITION_OPTIONS,
  SOLAR_OPTIONS,
  SUN_PERIOD_OPTIONS,
  optionLabel,
  type BuildingDefaultsForm,
} from '@/apps/builder/lib/unit-spec'
import type { GridUnit } from '@/apps/builder/lib/unit-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Amenity } from '@/lib/api'

type BuildingWizardUnitSpecCardProps = {
  unit: GridUnit
  defaults: BuildingDefaultsForm
  amenities: Amenity[]
  canApplyToTypical: boolean
  onChange: (unit: GridUnit) => void
  onApplyToTypical: () => void
}

function inheritLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string {
  const label = optionLabel(options, value)

  return label ? `Herdar do empreendimento (${label})` : 'Herdar do empreendimento'
}

export function BuildingWizardUnitSpecCard({
  unit,
  defaults,
  amenities,
  canApplyToTypical,
  onChange,
  onApplyToTypical,
}: BuildingWizardUnitSpecCardProps) {
  const buildingAmenityIds = new Set(defaults.amenity_ids)
  const inherited = amenities.filter((amenity) => buildingAmenityIds.has(amenity.id))
  const extrasCatalog = amenities.filter((amenity) => !buildingAmenityIds.has(amenity.id))

  function patch(partial: Partial<GridUnit>) {
    onChange({ ...unit, ...partial })
  }

  function toggleExtra(amenityId: number, checked: boolean) {
    const extraAmenityIds = checked
      ? [...unit.extraAmenityIds, amenityId]
      : unit.extraAmenityIds.filter((id) => id !== amenityId)

    patch({ extraAmenityIds })
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Ficha da unidade {unit.code}</h3>
          <p className="text-xs text-muted-foreground">
            Campos vazios de forro, aberturas, piso e sol herdam o padrão do empreendimento.
            Preço pode ficar em branco no rascunho.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={!canApplyToTypical} onClick={onApplyToTypical}>
          Aplicar nas posições iguais
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`wizard-spec-total-${unit.key}`}>Área total (m²)</Label>
          <Input
            id={`wizard-spec-total-${unit.key}`}
            inputMode="decimal"
            value={unit.totalAreaM2}
            onChange={(e) => patch({ totalAreaM2: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`wizard-spec-price-${unit.key}`}>Preço-base (R$)</Label>
          <Input
            id={`wizard-spec-price-${unit.key}`}
            inputMode="decimal"
            value={unit.priceBase}
            onChange={(e) => patch({ priceBase: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`wizard-spec-competence-${unit.key}`}>Competência INCC</Label>
          <Input
            id={`wizard-spec-competence-${unit.key}`}
            type="date"
            value={unit.priceCompetence}
            onChange={(e) => patch({ priceCompetence: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`wizard-spec-bedrooms-${unit.key}`}>Quartos</Label>
          <Input
            id={`wizard-spec-bedrooms-${unit.key}`}
            inputMode="numeric"
            value={unit.bedrooms}
            onChange={(e) => patch({ bedrooms: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`wizard-spec-suites-${unit.key}`}>Suítes</Label>
          <Input
            id={`wizard-spec-suites-${unit.key}`}
            inputMode="numeric"
            value={unit.suites}
            onChange={(e) => patch({ suites: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`wizard-spec-bathrooms-${unit.key}`}>Banheiros</Label>
          <Input
            id={`wizard-spec-bathrooms-${unit.key}`}
            inputMode="numeric"
            value={unit.bathrooms}
            onChange={(e) => patch({ bathrooms: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`wizard-spec-powder-${unit.key}`}>Lavabos</Label>
          <Input
            id={`wizard-spec-powder-${unit.key}`}
            inputMode="numeric"
            value={unit.powderRooms}
            onChange={(e) => patch({ powderRooms: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`wizard-spec-balconies-${unit.key}`}>Sacadas</Label>
          <Input
            id={`wizard-spec-balconies-${unit.key}`}
            inputMode="numeric"
            value={unit.balconies}
            onChange={(e) => patch({ balconies: e.target.value })}
          />
        </div>
        <BuildingWizardEnumSelect
          id={`wizard-spec-position-${unit.key}`}
          label="Posição do imóvel"
          value={unit.propertyPosition}
          emptyLabel="Não informado"
          options={PROPERTY_POSITION_OPTIONS}
          onChange={(propertyPosition) => patch({ propertyPosition })}
        />
        <BuildingWizardEnumSelect
          id={`wizard-spec-ceiling-${unit.key}`}
          label="Forro"
          value={unit.ceilingType}
          emptyLabel={inheritLabel(CEILING_OPTIONS, defaults.ceiling_type)}
          options={CEILING_OPTIONS}
          onChange={(ceilingType) => patch({ ceilingType })}
        />
        <BuildingWizardEnumSelect
          id={`wizard-spec-opening-${unit.key}`}
          label="Aberturas"
          value={unit.openingType}
          emptyLabel={inheritLabel(OPENING_OPTIONS, defaults.opening_type)}
          options={OPENING_OPTIONS}
          onChange={(openingType) => patch({ openingType })}
        />
        <BuildingWizardEnumSelect
          id={`wizard-spec-flooring-${unit.key}`}
          label="Piso"
          value={unit.flooringType}
          emptyLabel={inheritLabel(FLOORING_OPTIONS, defaults.flooring_type)}
          options={FLOORING_OPTIONS}
          onChange={(flooringType) => patch({ flooringType })}
        />
        <BuildingWizardEnumSelect
          id={`wizard-spec-solar-${unit.key}`}
          label="Posição solar"
          value={unit.solarPosition}
          emptyLabel={inheritLabel(SOLAR_OPTIONS, defaults.solar_position)}
          options={SOLAR_OPTIONS}
          onChange={(solarPosition) => patch({ solarPosition })}
        />
        <BuildingWizardEnumSelect
          id={`wizard-spec-sun-${unit.key}`}
          label="Período de sol"
          value={unit.sunPeriod}
          emptyLabel={inheritLabel(SUN_PERIOD_OPTIONS, defaults.sun_period)}
          options={SUN_PERIOD_OPTIONS}
          onChange={(sunPeriod) => patch({ sunPeriod })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Adicionais desta unidade</p>
        {inherited.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Do empreendimento (não dá para desligar): {inherited.map((item) => item.name).join(', ')}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum adicional herdado do empreendimento.</p>
        )}
        {extrasCatalog.length === 0 ? (
          <p className="text-xs text-muted-foreground">Não há adicionais extras no catálogo.</p>
        ) : (
          extrasCatalog.map((amenity) => {
            const checked = unit.extraAmenityIds.includes(amenity.id)

            return (
              <label key={amenity.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked}
                  onChange={(e) => toggleExtra(amenity.id, e.target.checked)}
                />
                Extra: {amenity.name}
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}
