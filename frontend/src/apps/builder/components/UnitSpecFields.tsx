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
import { type UnitSpecForm } from '@/apps/builder/lib/unit-spec-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Amenity } from '@/lib/api'

type UnitSpecFieldsProps = {
  idPrefix: string
  spec: UnitSpecForm
  amenities: Amenity[]
  buildingAmenityIds: number[]
  defaults?: BuildingDefaultsForm
  disabled?: boolean
  onChange: (spec: UnitSpecForm) => void
}

function inheritLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string {
  const label = optionLabel(options, value)

  return label ? `Herdar do empreendimento (${label})` : 'Herdar do empreendimento'
}

export function UnitSpecFields({
  idPrefix,
  spec,
  amenities,
  buildingAmenityIds,
  defaults,
  disabled = false,
  onChange,
}: UnitSpecFieldsProps) {
  const inheritedIds = new Set(buildingAmenityIds)
  const inherited = amenities.filter((amenity) => inheritedIds.has(amenity.id))
  const extrasCatalog = amenities.filter((amenity) => !inheritedIds.has(amenity.id))

  function patch(partial: Partial<UnitSpecForm>) {
    onChange({ ...spec, ...partial })
  }

  function toggleExtra(amenityId: number, checked: boolean) {
    const extraAmenityIds = checked
      ? [...spec.extraAmenityIds, amenityId]
      : spec.extraAmenityIds.filter((id) => id !== amenityId)

    patch({ extraAmenityIds })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-private-area`}>Área privativa (m²)</Label>
          <Input
            id={`${idPrefix}-private-area`}
            inputMode="decimal"
            value={spec.privateAreaM2}
            disabled={disabled}
            onChange={(e) => patch({ privateAreaM2: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-total-area`}>Área total (m²)</Label>
          <Input
            id={`${idPrefix}-total-area`}
            inputMode="decimal"
            value={spec.totalAreaM2}
            disabled={disabled}
            onChange={(e) => patch({ totalAreaM2: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-price-base`}>Preço-base (R$)</Label>
          <Input
            id={`${idPrefix}-price-base`}
            inputMode="decimal"
            value={spec.priceBase}
            disabled={disabled}
            onChange={(e) => patch({ priceBase: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-competence`}>Competência INCC</Label>
          <Input
            id={`${idPrefix}-competence`}
            type="date"
            value={spec.priceCompetence}
            disabled={disabled}
            onChange={(e) => patch({ priceCompetence: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-bedrooms`}>Quartos</Label>
          <Input
            id={`${idPrefix}-bedrooms`}
            inputMode="numeric"
            value={spec.bedrooms}
            disabled={disabled}
            onChange={(e) => patch({ bedrooms: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-suites`}>Suítes</Label>
          <Input
            id={`${idPrefix}-suites`}
            inputMode="numeric"
            value={spec.suites}
            disabled={disabled}
            onChange={(e) => patch({ suites: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-bathrooms`}>Banheiros</Label>
          <Input
            id={`${idPrefix}-bathrooms`}
            inputMode="numeric"
            value={spec.bathrooms}
            disabled={disabled}
            onChange={(e) => patch({ bathrooms: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-powder`}>Lavabos</Label>
          <Input
            id={`${idPrefix}-powder`}
            inputMode="numeric"
            value={spec.powderRooms}
            disabled={disabled}
            onChange={(e) => patch({ powderRooms: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-balconies`}>Sacadas</Label>
          <Input
            id={`${idPrefix}-balconies`}
            inputMode="numeric"
            value={spec.balconies}
            disabled={disabled}
            onChange={(e) => patch({ balconies: e.target.value })}
          />
        </div>
        <BuildingWizardEnumSelect
          id={`${idPrefix}-position`}
          label="Posição do imóvel"
          value={spec.propertyPosition}
          emptyLabel="Não informado"
          options={PROPERTY_POSITION_OPTIONS}
          onChange={(propertyPosition) => patch({ propertyPosition })}
        />
        <BuildingWizardEnumSelect
          id={`${idPrefix}-ceiling`}
          label="Forro"
          value={spec.ceilingType}
          emptyLabel={inheritLabel(CEILING_OPTIONS, defaults?.ceiling_type ?? '')}
          options={CEILING_OPTIONS}
          onChange={(ceilingType) => patch({ ceilingType })}
        />
        <BuildingWizardEnumSelect
          id={`${idPrefix}-opening`}
          label="Aberturas"
          value={spec.openingType}
          emptyLabel={inheritLabel(OPENING_OPTIONS, defaults?.opening_type ?? '')}
          options={OPENING_OPTIONS}
          onChange={(openingType) => patch({ openingType })}
        />
        <BuildingWizardEnumSelect
          id={`${idPrefix}-flooring`}
          label="Piso"
          value={spec.flooringType}
          emptyLabel={inheritLabel(FLOORING_OPTIONS, defaults?.flooring_type ?? '')}
          options={FLOORING_OPTIONS}
          onChange={(flooringType) => patch({ flooringType })}
        />
        <BuildingWizardEnumSelect
          id={`${idPrefix}-solar`}
          label="Posição solar"
          value={spec.solarPosition}
          emptyLabel={inheritLabel(SOLAR_OPTIONS, defaults?.solar_position ?? '')}
          options={SOLAR_OPTIONS}
          onChange={(solarPosition) => patch({ solarPosition })}
        />
        <BuildingWizardEnumSelect
          id={`${idPrefix}-sun`}
          label="Período de sol"
          value={spec.sunPeriod}
          emptyLabel={inheritLabel(SUN_PERIOD_OPTIONS, defaults?.sun_period ?? '')}
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
            const checked = spec.extraAmenityIds.includes(amenity.id)

            return (
              <label key={amenity.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked}
                  disabled={disabled}
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
