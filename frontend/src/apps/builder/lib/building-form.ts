import {
  zipDigits,
  type BuildingIdentityForm,
} from '@/apps/builder/components/BuildingWizardIdentityStep'
import { type BuildingDefaultsForm } from '@/apps/builder/lib/unit-spec'
import type { Building } from '@/lib/api'

export function identityFromBuilding(building: Building): BuildingIdentityForm {
  return {
    name: building.name,
    zip: zipDigits(building.zip ?? ''),
    street: building.street ?? '',
    number: building.number ?? '',
    complement: building.complement ?? '',
    neighborhood: building.neighborhood ?? '',
    city: building.city ?? '',
    state: building.state ?? '',
  }
}

export function identityUpdatePayload(form: BuildingIdentityForm) {
  return {
    name: form.name,
    zip: form.zip || null,
    street: form.street || null,
    number: form.number || null,
    complement: form.complement || null,
    neighborhood: form.neighborhood || null,
    city: form.city || null,
    state: form.state || null,
  }
}

export function defaultsFromBuilding(building: Building): BuildingDefaultsForm {
  return {
    ceiling_type: building.ceiling_type ?? '',
    opening_type: building.opening_type ?? '',
    flooring_type: building.flooring_type ?? '',
    solar_position: building.solar_position ?? '',
    sun_period: building.sun_period ?? '',
    amenity_ids: (building.amenities ?? []).map((amenity) => amenity.id),
  }
}

export function defaultsUpdatePayload(defaults: BuildingDefaultsForm) {
  return {
    ceiling_type: defaults.ceiling_type || null,
    opening_type: defaults.opening_type || null,
    flooring_type: defaults.flooring_type || null,
    solar_position: defaults.solar_position || null,
    sun_period: defaults.sun_period || null,
    amenity_ids: defaults.amenity_ids,
  }
}
