import type { FloorKind, Unit } from '@/lib/api'
import { formatListedPrice } from '@/lib/unit-listing'

export type BrokerFloorRow = {
  key: string
  towerId: string | null
  towerName: string | null
  floor: number | null
  kind: FloorKind | null
  units: Unit[]
}

function laneOf(unit: Unit): 'garage' | 'unit' {
  return unit.floor_kind === 'garage' ? 'garage' : 'unit'
}

function towerIdOf(unit: Unit): string | null {
  return unit.tower?.id ?? unit.tower_id ?? null
}

export function groupUnitsByFloor(units: Unit[]): BrokerFloorRow[] {
  const groups = new Map<string, BrokerFloorRow>()

  for (const unit of units) {
    const towerId = towerIdOf(unit)
    const lane = laneOf(unit)
    const key = `${towerId ?? ''}:${unit.floor ?? 'none'}:${lane}`
    const existing = groups.get(key)

    if (existing) {
      existing.units.push(unit)
      if (existing.kind == null && unit.floor_kind && unit.floor_kind !== 'garage') {
        existing.kind = unit.floor_kind
      }
      continue
    }

    groups.set(key, {
      key,
      towerId,
      towerName: unit.tower?.name ?? null,
      floor: unit.floor,
      kind: lane === 'garage' ? 'garage' : unit.floor_kind && unit.floor_kind !== 'garage' ? unit.floor_kind : null,
      units: [unit],
    })
  }

  return [...groups.values()]
    .map((row) => ({
      ...row,
      units: row.units.toSorted((left, right) => left.code.localeCompare(right.code, 'pt-BR', { numeric: true })),
    }))
    .toSorted((left, right) => {
      const tower = (left.towerName ?? '').localeCompare(right.towerName ?? '', 'pt-BR')
      if (tower !== 0) {
        return tower
      }

      if (left.floor == null && right.floor != null) {
        return 1
      }

      if (right.floor == null && left.floor != null) {
        return -1
      }

      if (left.floor != null && right.floor != null && left.floor !== right.floor) {
        return right.floor - left.floor
      }

      if (left.kind === 'garage' && right.kind !== 'garage') {
        return 1
      }

      if (right.kind === 'garage' && left.kind !== 'garage') {
        return -1
      }

      return 0
    })
}

export function floorTitle(floor: number | null, kind: FloorKind | null): string {
  if (floor == null) {
    return kind === 'garage' ? 'Garagem' : 'Sem andar'
  }

  if (floor < 0) {
    return `Subsolo ${Math.abs(floor)}`
  }

  if (floor === 0) {
    return 'Térreo'
  }

  return `${floor}º andar`
}

export function bedroomSummary(units: Unit[]): string | null {
  const counts = [...new Set(
    units.flatMap((unit) => (unit.bedrooms != null && unit.bedrooms > 0 ? [unit.bedrooms] : [])),
  )].toSorted((left, right) => left - right)

  if (counts.length === 0) {
    return null
  }

  const noun = counts.length === 1 && counts[0] === 1 ? 'dorm' : 'dorms'
  const listed = counts.length === 1
    ? String(counts[0])
    : `${counts.slice(0, -1).join(', ')} e ${counts[counts.length - 1]}`

  return `${listed} ${noun}`
}

function areaValues(units: Unit[]): number[] {
  return units.flatMap((unit) => {
    const raw = unit.private_area_m2 || unit.area_m2
    if (raw == null || raw === '') {
      return []
    }

    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? [value] : []
  })
}

function formatMeters(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function areaSpan(units: Unit[]): string | null {
  const values = areaValues(units)
  if (values.length === 0) {
    return null
  }

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (min === max) {
    return `${formatMeters(min)} m²`
  }

  return `${formatMeters(min)} a ${formatMeters(max)} m²`
}

function countNoun(count: number, garage: boolean): string {
  if (garage) {
    return count === 1 ? 'vaga' : 'vagas'
  }

  return count === 1 ? 'unidade' : 'unidades'
}

function isAvailable(unit: Unit): boolean {
  return unit.status === 'available'
}

export function floorStockSummary(units: Unit[], garage: boolean): string {
  const available = units.filter(isAvailable).length
  const count = `${available} de ${units.length} ${countNoun(units.length, garage)}`
  const area = areaSpan(units)

  return area ? `${count} - ${area}` : count
}

export function floorPriceSummary(units: Unit[]): string {
  const values = units.flatMap((unit) => {
    if (unit.price == null || unit.price === '') {
      return []
    }

    const value = Number(unit.price)
    return Number.isFinite(value) ? [value] : []
  })

  if (values.length === 0) {
    return 'Valor sob consulta'
  }

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (min === max) {
    return formatListedPrice(String(min))
  }

  return `${formatListedPrice(String(min))} a ${formatListedPrice(String(max))}`
}
