export const PRE_RESERVE_POLL_MS = 5000

export type UnitStatusSnapshot = Map<number, string>

export function buildStatusSnapshot(units: { id: number; status: string }[]): UnitStatusSnapshot {
  return new Map(units.map((unit) => [unit.id, unit.status]))
}

export function detectPreHoldTransitionToast(
  previous: UnitStatusSnapshot,
  nextUnits: {
    id: number
    status: string
    code: string
    pre_hold?: { held_by_me: boolean } | null
  }[],
  toastShownFor: Set<number>,
): { unitCode: string; unitId: number } | null {
  for (const unit of nextUnits) {
    if (toastShownFor.has(unit.id)) {
      continue
    }

    const previousStatus = previous.get(unit.id)
    if (previousStatus !== 'available' || unit.status !== 'pre_reserved') {
      continue
    }

    if (unit.pre_hold?.held_by_me) {
      continue
    }

    return { unitCode: unit.code, unitId: unit.id }
  }

  return null
}
