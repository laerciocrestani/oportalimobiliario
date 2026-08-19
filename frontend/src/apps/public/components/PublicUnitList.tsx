import {
  formatAmenityNames,
  formatListedPrice,
  formatUnitSpecSummary,
} from '@/lib/unit-listing'
import type { Unit } from '@/lib/api'

type PublicUnitListProps = {
  units: Unit[]
}

export function PublicUnitList({ units }: PublicUnitListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {units.map((unit) => {
        const spec = formatUnitSpecSummary(unit)
        const amenities = formatAmenityNames(unit.amenities)

        return (
          <li
            key={unit.id ?? unit.code}
            className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{unit.code}</span>
              <span className="text-sm font-semibold">{formatListedPrice(unit.price)}</span>
            </div>
            {spec ? <p className="text-xs text-muted-foreground">{spec}</p> : null}
            {amenities ? <p className="text-xs text-muted-foreground">{amenities}</p> : null}
          </li>
        )
      })}
    </ul>
  )
}
