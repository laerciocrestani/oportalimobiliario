export type UnitListingAmenity = {
  name: string
}

export type UnitListingSpec = {
  area_m2?: string | null
  private_area_m2?: string | null
  floor?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  suites?: number | null
  amenities?: UnitListingAmenity[] | null
}

function formatArea(value: string): string {
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function plural(count: number, singular: string, pluralLabel: string): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`
}

export function formatListedPrice(value: string | null | undefined): string {
  if (value == null || value === '') {
    return 'Valor sob consulta'
  }

  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatUnitSpecSummary(unit: UnitListingSpec): string {
  const parts: string[] = []
  const area = unit.private_area_m2 || unit.area_m2

  if (area) {
    parts.push(`${formatArea(area)} m²`)
  }

  if (unit.bedrooms != null && unit.bedrooms > 0) {
    parts.push(plural(unit.bedrooms, 'quarto', 'quartos'))
  }

  if (unit.suites != null && unit.suites > 0) {
    parts.push(plural(unit.suites, 'suíte', 'suítes'))
  }

  if (unit.bathrooms != null && unit.bathrooms > 0) {
    parts.push(plural(unit.bathrooms, 'banheiro', 'banheiros'))
  }

  if (unit.floor != null) {
    parts.push(`${unit.floor}º andar`)
  }

  return parts.join(' · ')
}

export function formatAmenityNames(
  amenities: UnitListingAmenity[] | null | undefined,
  limit = 3,
): string {
  if (!amenities || amenities.length === 0) {
    return ''
  }

  const names = amenities.slice(0, limit).map((amenity) => amenity.name)
  const extra = amenities.length - limit

  return extra > 0 ? `${names.join(', ')} +${extra}` : names.join(', ')
}

export function formatPriceCompetence(competence: string | null | undefined): string | null {
  if (!competence) {
    return null
  }

  const [, year, month] = competence.match(/^(\d{4})-(\d{2})/) ?? []

  if (!year || !month) {
    return null
  }

  return `${month}/${year}`
}
