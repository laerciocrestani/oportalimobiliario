import { publicMediaUrl, type PublicBuildingListItem, type PublicUnit } from '@/lib/api'

/** Imagens no HTML precisam de um host que o navegador resolva. No Docker, a API interna é `backend`. */
export function browserMediaUrl(path: string): string {
  const absolute = publicMediaUrl(path)

  try {
    const url = new URL(absolute)

    if (url.hostname === 'backend') {
      url.hostname = 'api.localhost'
      url.port = '8000'
    }

    return url.toString()
  } catch {
    return absolute
  }
}

export const BROKER_URL = 'http://corretor.localhost:5173/login'
export const BUILDER_URL = 'http://construtora.localhost:5173/login'
export const LIST_STORAGE_KEY = 'opim-modelo-list'

export type HomeSort = 'relevancia' | 'menor-preco' | 'maior-preco' | 'nome'

export type HomeQuery = {
  cidade: string
  ate: number | null
  ordem: HomeSort
}

export type HomeRecord = {
  index: number
  name: string
  city: string | null
  price: number | null
}

export type DetailQuery = {
  codigo: string
  dorms: number | null
  andarDe: number | null
  andarAte: number | null
  ate: number | null
  diferencial: string
  ordem: string | null
  unidade: string
  comparar: string[]
}

export type ModeloUnit = {
  index: number
  code: string
  floor: number | null
  areaM2: number | null
  privateAreaM2: number | null
  bedrooms: number | null
  bathrooms: number | null
  suites: number | null
  price: number | null
  priceBase: number | null
  priceCompetence: string | null
  status: string
  amenities: string[]
}

export type UnitSortRecord = {
  index: number
  code: string
  floor: number | null
  area: number | null
  price: number | null
}

export type Fact = {
  label: string
  value: string
}

export type UnitColumn =
  | 'code'
  | 'floor'
  | 'privateArea'
  | 'bedrooms'
  | 'suites'
  | 'bathrooms'
  | 'amenities'
  | 'price'

const STATUS_LABELS: Record<string, string> = {
  pre_reserved: 'Pré-reservada',
  reserved: 'Reservada',
  sold: 'Vendida',
  unavailable: 'Indisponível',
}

const HOME_SORTS = new Set<HomeSort>(['relevancia', 'menor-preco', 'maior-preco', 'nome'])
const DETAIL_ORDEM = /^(codigo|andar|area|preco)-(asc|desc)$/

export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function toNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') {
    return null
  }

  const number = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(number) ? number : null
}

export function formatBrl(value: number): string {
  const cents = Math.abs(Math.round(value * 100) % 100)

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: cents === 0 ? 0 : 2,
    maximumFractionDigits: cents === 0 ? 0 : 2,
  })
}

export function formatArea(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²`
}

export function formatAreaRange(min: number, max: number): string {
  if (min === max) {
    return formatArea(min)
  }

  const left = min.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  const right = max.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

  return `${left}–${right} m²`
}

export function formatPhone(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim()

  if (!trimmed) {
    return null
  }

  const digits = trimmed.replace(/\D/g, '')

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return trimmed
}

export function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 10 || digits.length === 11) {
    return `tel:+55${digits}`
  }

  return `tel:${digits || phone.trim()}`
}

export function formatFloor(floor: number): string {
  if (floor === 0) {
    return 'Térreo'
  }

  if (floor < 0) {
    const level = Math.abs(floor)

    return level === 1 ? 'Subsolo' : `${level}º subsolo`
  }

  return `${floor}º andar`
}

export function formatPlace(city: string | null | undefined, state: string | null | undefined): string | null {
  const parts = [city?.trim(), state?.trim()].filter((part): part is string => Boolean(part))

  return parts.length > 0 ? parts.join(', ') : null
}

export function launchCount(count: number): string {
  const noun = count === 1 ? 'lançamento' : 'lançamentos'

  return `${count.toLocaleString('pt-BR')} ${noun}`
}

export function unitCount(count: number): string {
  const noun = count === 1 ? 'unidade' : 'unidades'

  return `${count.toLocaleString('pt-BR')} ${noun}`
}

export function unitCounter(visible: number, total: number): string {
  const noun = total === 1 ? 'unidade' : 'unidades'

  return `${visible.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} ${noun}`
}

export function statusLabel(status: string | null | undefined): string | null {
  if (!status || status === 'available') {
    return null
  }

  return STATUS_LABELS[status] ?? null
}

export function descriptionParagraphs(description: string | null | undefined): string[] {
  if (!description?.trim()) {
    return []
  }

  return description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

export function activeAmenityNames(
  amenities: { name?: string | null; active?: boolean }[] | null | undefined,
): string[] {
  if (!amenities) {
    return []
  }

  const names: string[] = []

  for (const amenity of amenities) {
    if (amenity.active === false) {
      continue
    }

    const name = amenity.name?.trim()

    if (!name || names.some((current) => fold(current) === fold(name))) {
      continue
    }

    names.push(name)
  }

  return names
}

export function uniqueCities(cities: Array<string | null | undefined>): string[] {
  const seen = new Map<string, string>()

  for (const city of cities) {
    const trimmed = city?.trim()

    if (!trimmed) {
      continue
    }

    const key = fold(trimmed)

    if (!seen.has(key)) {
      seen.set(key, trimmed)
    }
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function parseHomeQuery(params: URLSearchParams): HomeQuery {
  const ordemRaw = params.get('ordem')
  const ordem = HOME_SORTS.has(ordemRaw as HomeSort) ? (ordemRaw as HomeSort) : 'relevancia'
  const ateDigits = (params.get('ate') ?? '').replace(/[^\d]/g, '')
  const ate = ateDigits ? Number(ateDigits) : 0

  return {
    cidade: (params.get('cidade') ?? '').trim(),
    ate: ate > 0 ? ate : null,
    ordem,
  }
}

export function toHomeSearch(query: HomeQuery): string {
  const params = new URLSearchParams()

  if (query.cidade) {
    params.set('cidade', query.cidade)
  }

  if (query.ate) {
    params.set('ate', String(query.ate))
  }

  if (query.ordem !== 'relevancia') {
    params.set('ordem', query.ordem)
  }

  const search = params.toString()

  return search ? `?${search}` : ''
}

export function matchesCity(city: string | null, query: string): boolean {
  if (!query) {
    return true
  }

  if (!city) {
    return false
  }

  return fold(city).includes(fold(query))
}

export function matchesPrice(price: number | null, ate: number | null): boolean {
  if (ate == null) {
    return true
  }

  if (price == null) {
    return false
  }

  return price <= ate
}

export function compareHome(a: HomeRecord, b: HomeRecord, ordem: HomeSort): number {
  if (ordem === 'nome') {
    return a.name.localeCompare(b.name, 'pt-BR') || a.index - b.index
  }

  if (ordem === 'menor-preco' || ordem === 'maior-preco') {
    if (a.price == null && b.price == null) {
      return a.index - b.index
    }

    if (a.price == null) {
      return 1
    }

    if (b.price == null) {
      return -1
    }

    const diff = ordem === 'menor-preco' ? a.price - b.price : b.price - a.price

    return diff || a.index - b.index
  }

  return a.index - b.index
}

function parseBound(value: string | null): number | null {
  if (value == null || value.trim() === '') {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number) ? Math.trunc(number) : null
}

function parseMoney(value: string | null): number | null {
  const digits = (value ?? '').replace(/[^\d]/g, '')

  if (!digits) {
    return null
  }

  const number = Number(digits)

  return number > 0 ? number : null
}

export function parseDetailQuery(params: URLSearchParams): DetailQuery {
  const ordemRaw = params.get('ordem') ?? ''
  const dorms = parseBound(params.get('dorms'))
  const comparar = (params.get('comparar') ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter((code, index, all) => code !== '' && all.indexOf(code) === index)
    .slice(0, 3)

  return {
    codigo: (params.get('codigo') ?? '').trim(),
    dorms,
    andarDe: parseBound(params.get('andar-de')),
    andarAte: parseBound(params.get('andar-ate')),
    ate: parseMoney(params.get('ate')),
    diferencial: (params.get('diferencial') ?? '').trim(),
    ordem: DETAIL_ORDEM.test(ordemRaw) ? ordemRaw : null,
    unidade: (params.get('unidade') ?? '').trim(),
    comparar,
  }
}

export function toDetailSearch(query: DetailQuery): string {
  const params = new URLSearchParams()

  if (query.codigo) {
    params.set('codigo', query.codigo)
  }

  if (query.dorms != null) {
    params.set('dorms', String(query.dorms))
  }

  if (query.andarDe != null) {
    params.set('andar-de', String(query.andarDe))
  }

  if (query.andarAte != null) {
    params.set('andar-ate', String(query.andarAte))
  }

  if (query.ate) {
    params.set('ate', String(query.ate))
  }

  if (query.diferencial) {
    params.set('diferencial', query.diferencial)
  }

  if (query.ordem) {
    params.set('ordem', query.ordem)
  }

  if (query.unidade) {
    params.set('unidade', query.unidade)
  }

  if (query.comparar.length > 0) {
    params.set('comparar', query.comparar.join(','))
  }

  const search = params.toString()

  return search ? `?${search}` : ''
}

export function unitMatches(
  unit: {
    code: string
    floor: number | null
    bedrooms: number | null
    price: number | null
    amenities: string[]
  },
  query: DetailQuery,
): boolean {
  if (query.codigo && !fold(unit.code).includes(fold(query.codigo))) {
    return false
  }

  if (query.dorms != null && unit.bedrooms !== query.dorms) {
    return false
  }

  if (query.andarDe != null || query.andarAte != null) {
    if (unit.floor == null) {
      return false
    }

    if (query.andarDe != null && unit.floor < query.andarDe) {
      return false
    }

    if (query.andarAte != null && unit.floor > query.andarAte) {
      return false
    }
  }

  if (query.ate != null && (unit.price == null || unit.price > query.ate)) {
    return false
  }

  if (query.diferencial) {
    const target = fold(query.diferencial)

    if (!unit.amenities.some((name) => fold(name) === target)) {
      return false
    }
  }

  return true
}

function compareNullableNumber(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a == null && b == null) {
    return 0
  }

  if (a == null) {
    return 1
  }

  if (b == null) {
    return -1
  }

  return (a - b) * direction
}

export function compareUnitValues(a: UnitSortRecord, b: UnitSortRecord, ordem: string | null): number {
  if (!ordem) {
    return a.index - b.index
  }

  const [key, directionName] = ordem.split('-')
  const direction: 1 | -1 = directionName === 'desc' ? -1 : 1

  if (key === 'codigo') {
    if (!a.code && !b.code) {
      return a.index - b.index
    }

    if (!a.code) {
      return 1
    }

    if (!b.code) {
      return -1
    }

    const diff = a.code.localeCompare(b.code, 'pt-BR', { numeric: true })

    return diff * direction || a.index - b.index
  }

  const field = key === 'andar' ? 'floor' : key === 'area' ? 'area' : key === 'preco' ? 'price' : null

  if (!field) {
    return a.index - b.index
  }

  return compareNullableNumber(a[field], b[field], direction) || a.index - b.index
}

export function normalizeUnit(raw: PublicUnit, index: number): ModeloUnit {
  return {
    index,
    code: raw.code ?? '',
    floor: raw.floor ?? null,
    areaM2: toNumber(raw.area_m2),
    privateAreaM2: toNumber(raw.private_area_m2),
    bedrooms: raw.bedrooms ?? null,
    bathrooms: raw.bathrooms ?? null,
    suites: raw.suites ?? null,
    price: toNumber(raw.price),
    priceBase: toNumber(raw.price_base),
    priceCompetence: raw.price_competence ?? null,
    status: raw.status ?? 'available',
    amenities: activeAmenityNames(raw.amenities),
  }
}

export function showsIncc(unit: Pick<ModeloUnit, 'price' | 'priceBase' | 'priceCompetence'>): boolean {
  return unit.price != null && unit.priceBase != null && Boolean(unit.priceCompetence)
}

export function visibleColumns(units: ModeloUnit[]): UnitColumn[] {
  const has = (predicate: (unit: ModeloUnit) => boolean) => units.some(predicate)
  const columns: UnitColumn[] = []

  if (has((unit) => unit.code.trim() !== '')) {
    columns.push('code')
  }

  if (has((unit) => unit.floor != null)) {
    columns.push('floor')
  }

  if (has((unit) => unit.privateAreaM2 != null)) {
    columns.push('privateArea')
  }

  if (has((unit) => unit.bedrooms != null)) {
    columns.push('bedrooms')
  }

  if (has((unit) => unit.suites != null)) {
    columns.push('suites')
  }

  if (has((unit) => unit.bathrooms != null)) {
    columns.push('bathrooms')
  }

  if (has((unit) => unit.amenities.length > 0)) {
    columns.push('amenities')
  }

  if (units.length > 0) {
    columns.push('price')
  }

  return columns
}

export function distinctAmenities(units: ModeloUnit[]): string[] {
  const names = new Set<string>()

  for (const unit of units) {
    for (const name of unit.amenities) {
      names.add(name)
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function bedroomOptions(units: ModeloUnit[]): number[] {
  return [...new Set(units.flatMap((unit) => (unit.bedrooms == null ? [] : [unit.bedrooms])))].sort(
    (a, b) => a - b,
  )
}

export function buildingFacts(units: ModeloUnit[]): Fact[] {
  const facts: Fact[] = []

  if (units.length > 0) {
    facts.push({ label: 'Unidades', value: unitCount(units.length) })
  }

  const prices = units.flatMap((unit) => (unit.price == null ? [] : [unit.price]))

  if (prices.length > 0) {
    facts.push({ label: 'A partir de', value: formatBrl(Math.min(...prices)) })
  }

  const areas = units.flatMap((unit) => {
    const area = unit.privateAreaM2 ?? unit.areaM2

    return area == null ? [] : [area]
  })

  if (areas.length > 0) {
    facts.push({
      label: 'Área',
      value: formatAreaRange(Math.min(...areas), Math.max(...areas)),
    })
  }

  const bedrooms = units.flatMap((unit) => (unit.bedrooms == null ? [] : [unit.bedrooms]))

  if (bedrooms.length > 0) {
    const min = Math.min(...bedrooms)
    const max = Math.max(...bedrooms)

    facts.push({
      label: 'Dormitórios',
      value: min === max ? String(min) : `${min}–${max}`,
    })
  }

  return facts.slice(0, 4)
}

export function lowestPrice(units: ModeloUnit[]): number | null {
  const prices = units.flatMap((unit) => (unit.price == null ? [] : [unit.price]))

  return prices.length > 0 ? Math.min(...prices) : null
}

export function cardMeta(unit: {
  code: string
  area_m2: string | null
  floor: number | null
}): string {
  const area = toNumber(unit.area_m2)

  if (area != null) {
    return `${unit.code} · ${formatArea(area)}`
  }

  if (unit.floor != null) {
    return `${unit.code} · ${formatFloor(unit.floor)}`
  }

  return unit.code
}

export function listPrice(building: PublicBuildingListItem): number | null {
  return toNumber(building.cheapest_unit?.price)
}

export function nextOrdem(current: string | null, key: 'codigo' | 'andar' | 'area' | 'preco'): string {
  if (current === `${key}-asc`) {
    return `${key}-desc`
  }

  return `${key}-asc`
}

export function detailHref(path: string, query: DetailQuery, patch: Partial<DetailQuery>): string {
  return `${path}${toDetailSearch({ ...query, ...patch })}`
}
