import { BuildingWizardEnumSelect } from '@/apps/builder/components/BuildingWizardEnumSelect'
import {
  CEILING_OPTIONS,
  FLOORING_OPTIONS,
  OPENING_OPTIONS,
  SOLAR_OPTIONS,
  SUN_PERIOD_OPTIONS,
  type BuildingDefaultsForm,
} from '@/apps/builder/lib/unit-spec'
import type { Amenity } from '@/lib/api'

type BuildingWizardDefaultsCardProps = {
  defaults: BuildingDefaultsForm
  amenities: Amenity[]
  onChange: (defaults: BuildingDefaultsForm) => void
}

export function BuildingWizardDefaultsCard({
  defaults,
  amenities,
  onChange,
}: BuildingWizardDefaultsCardProps) {
  function toggleAmenity(amenityId: number, checked: boolean) {
    const amenity_ids = checked
      ? [...defaults.amenity_ids, amenityId]
      : defaults.amenity_ids.filter((id) => id !== amenityId)

    onChange({ ...defaults, amenity_ids })
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div>
        <h3 className="text-sm font-medium">Padrão do empreendimento</h3>
        <p className="text-xs text-muted-foreground">
          Forro, aberturas, piso, sol e adicionais valem para todas as unidades. A unidade só
          soma extras — não dá para desligar o adicional do prédio.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <BuildingWizardEnumSelect
          id="wizard-building-ceiling"
          label="Forro"
          value={defaults.ceiling_type}
          emptyLabel="Não informado"
          options={CEILING_OPTIONS}
          onChange={(ceiling_type) => onChange({ ...defaults, ceiling_type })}
        />
        <BuildingWizardEnumSelect
          id="wizard-building-opening"
          label="Aberturas"
          value={defaults.opening_type}
          emptyLabel="Não informado"
          options={OPENING_OPTIONS}
          onChange={(opening_type) => onChange({ ...defaults, opening_type })}
        />
        <BuildingWizardEnumSelect
          id="wizard-building-flooring"
          label="Piso"
          value={defaults.flooring_type}
          emptyLabel="Não informado"
          options={FLOORING_OPTIONS}
          onChange={(flooring_type) => onChange({ ...defaults, flooring_type })}
        />
        <BuildingWizardEnumSelect
          id="wizard-building-solar"
          label="Posição solar"
          value={defaults.solar_position}
          emptyLabel="Não informado"
          options={SOLAR_OPTIONS}
          onChange={(solar_position) => onChange({ ...defaults, solar_position })}
        />
        <BuildingWizardEnumSelect
          id="wizard-building-sun"
          label="Período de sol"
          value={defaults.sun_period}
          emptyLabel="Não informado"
          options={SUN_PERIOD_OPTIONS}
          onChange={(sun_period) => onChange({ ...defaults, sun_period })}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Adicionais do empreendimento</legend>
        {amenities.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum adicional ativo no catálogo.</p>
        ) : (
          amenities.map((amenity) => {
            const checked = defaults.amenity_ids.includes(amenity.id)

            return (
              <label key={amenity.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked}
                  onChange={(e) => toggleAmenity(amenity.id, e.target.checked)}
                />
                {amenity.name}
              </label>
            )
          })
        )}
      </fieldset>
    </div>
  )
}
