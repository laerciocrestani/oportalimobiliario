import type { Unit } from '@/lib/api'

export type UnitSpecForm = {
  privateAreaM2: string
  totalAreaM2: string
  bedrooms: string
  bathrooms: string
  suites: string
  powderRooms: string
  balconies: string
  priceBase: string
  priceCompetence: string
  propertyPosition: string
  solarPosition: string
  sunPeriod: string
  ceilingType: string
  openingType: string
  flooringType: string
  extraAmenityIds: number[]
}

export function emptyUnitSpecForm(): UnitSpecForm {
  return {
    privateAreaM2: '',
    totalAreaM2: '',
    bedrooms: '',
    bathrooms: '',
    suites: '',
    powderRooms: '',
    balconies: '',
    priceBase: '',
    priceCompetence: '',
    propertyPosition: '',
    solarPosition: '',
    sunPeriod: '',
    ceilingType: '',
    openingType: '',
    flooringType: '',
    extraAmenityIds: [],
  }
}

export function unitSpecFromUnit(unit: Unit): UnitSpecForm {
  return {
    privateAreaM2: displayNumber(unit.private_area_m2 ?? unit.area_m2),
    totalAreaM2: displayNumber(unit.total_area_m2),
    bedrooms: displayInt(unit.bedrooms),
    bathrooms: displayInt(unit.bathrooms),
    suites: displayInt(unit.suites),
    powderRooms: displayInt(unit.powder_rooms),
    balconies: displayInt(unit.balconies),
    priceBase: displayNumber(unit.price_base),
    priceCompetence: (unit.price_competence ?? '').slice(0, 10),
    propertyPosition: unit.property_position ?? '',
    solarPosition: unit.solar_position ?? '',
    sunPeriod: unit.sun_period ?? '',
    ceilingType: unit.ceiling_type ?? '',
    openingType: unit.opening_type ?? '',
    flooringType: unit.flooring_type ?? '',
    extraAmenityIds: (unit.extra_amenities ?? unit.amenities ?? []).map((amenity) => amenity.id),
  }
}

export function unitSpecPayload(spec: UnitSpecForm): Partial<Unit> & { amenity_ids: number[] } {
  const privateArea = emptyToNull(spec.privateAreaM2)

  return {
    area_m2: privateArea,
    private_area_m2: privateArea,
    total_area_m2: emptyToNull(spec.totalAreaM2),
    bedrooms: parseOptionalInt(spec.bedrooms),
    bathrooms: parseOptionalInt(spec.bathrooms),
    suites: parseOptionalInt(spec.suites),
    powder_rooms: parseOptionalInt(spec.powderRooms),
    balconies: parseOptionalInt(spec.balconies),
    price_base: emptyToNull(spec.priceBase),
    price_competence: parseCompetence(spec.priceCompetence),
    property_position: emptyToNull(spec.propertyPosition),
    solar_position: emptyToNull(spec.solarPosition),
    sun_period: emptyToNull(spec.sunPeriod),
    ceiling_type: emptyToNull(spec.ceilingType),
    opening_type: emptyToNull(spec.openingType),
    flooring_type: emptyToNull(spec.flooringType),
    amenity_ids: spec.extraAmenityIds,
  }
}

function displayNumber(value: string | number | null | undefined): string {
  if (value == null || value === '') {
    return ''
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return String(value)
  }

  return String(parsed)
}

function displayInt(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}

function parseOptionalInt(value: string): number | null {
  const normalized = value.trim()

  if (normalized === '') {
    return null
  }

  const parsed = Number(normalized)

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function parseCompetence(value: string): string | null {
  const normalized = value.trim()

  if (normalized === '') {
    return null
  }

  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return `${normalized}-01`
  }

  return normalized
}

function emptyToNull(value: string): string | null {
  const normalized = value.trim()

  return normalized === '' ? null : normalized
}
