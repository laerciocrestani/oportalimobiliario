export const CEILING_OPTIONS = [
  { value: 'plaster', label: 'Gesso' },
  { value: 'pvc', label: 'PVC' },
  { value: 'wood', label: 'Madeira' },
  { value: 'concrete', label: 'Concreto' },
  { value: 'none', label: 'Sem forro' },
] as const

export const OPENING_OPTIONS = [
  { value: 'aluminum', label: 'Alumínio' },
  { value: 'wood', label: 'Madeira' },
  { value: 'pvc', label: 'PVC' },
  { value: 'steel', label: 'Aço' },
] as const

export const FLOORING_OPTIONS = [
  { value: 'porcelain', label: 'Porcelanato' },
  { value: 'ceramic', label: 'Cerâmica' },
  { value: 'wood', label: 'Madeira' },
  { value: 'vinyl', label: 'Vinílico' },
  { value: 'laminate', label: 'Laminado' },
  { value: 'polished_concrete', label: 'Cimento queimado' },
] as const

export const SOLAR_OPTIONS = [
  { value: 'north', label: 'Norte' },
  { value: 'northeast', label: 'Nordeste' },
  { value: 'east', label: 'Leste' },
  { value: 'southeast', label: 'Sudeste' },
  { value: 'south', label: 'Sul' },
  { value: 'southwest', label: 'Sudoeste' },
  { value: 'west', label: 'Oeste' },
  { value: 'northwest', label: 'Noroeste' },
] as const

export const SUN_PERIOD_OPTIONS = [
  { value: 'morning', label: 'Manhã' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'full_day', label: 'Dia inteiro' },
] as const

export const PROPERTY_POSITION_OPTIONS = [
  { value: 'corner', label: 'Esquina' },
  { value: 'front', label: 'Frente' },
  { value: 'rear', label: 'Fundos' },
] as const

export type BuildingDefaultsForm = {
  ceiling_type: string
  opening_type: string
  flooring_type: string
  solar_position: string
  sun_period: string
  amenity_ids: number[]
}

export function emptyBuildingDefaults(): BuildingDefaultsForm {
  return {
    ceiling_type: '',
    opening_type: '',
    flooring_type: '',
    solar_position: '',
    sun_period: '',
    amenity_ids: [],
  }
}

export function optionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null
  }

  return options.find((option) => option.value === value)?.label ?? value
}
