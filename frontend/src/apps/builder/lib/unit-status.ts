export type UnitStatus =
  | 'available'
  | 'pre_reserved'
  | 'reserved'
  | 'sold'
  | 'unavailable'

export const unitStatusLabels: Record<UnitStatus, string> = {
  available: 'Disponível',
  pre_reserved: 'Pré-reserva',
  reserved: 'Reservado',
  sold: 'Vendido',
  unavailable: 'Indisponível',
}

export const unitStatusColors: Record<UnitStatus, string> = {
  available: 'bg-emerald-500',
  pre_reserved: 'bg-amber-400',
  reserved: 'bg-orange-500',
  sold: 'bg-slate-500',
  unavailable: 'bg-red-400',
}

export const unitStatusLegend: { status: UnitStatus; label: string; color: string }[] = (
  Object.keys(unitStatusLabels) as UnitStatus[]
).map((status) => ({
  status,
  label: unitStatusLabels[status],
  color: unitStatusColors[status],
}))
