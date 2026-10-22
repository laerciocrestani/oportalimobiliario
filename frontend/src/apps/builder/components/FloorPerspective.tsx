import riser from '@/apps/builder/assets/floor-perspective/riser.svg'
import roof from '@/apps/builder/assets/floor-perspective/roof.svg'
import side from '@/apps/builder/assets/floor-perspective/side.svg'
import slab from '@/apps/builder/assets/floor-perspective/slab.svg'
import topSide from '@/apps/builder/assets/floor-perspective/top-side.svg'
import topSlab from '@/apps/builder/assets/floor-perspective/top-slab.svg'
import unit from '@/apps/builder/assets/floor-perspective/unit.svg'
import { cn } from '@/lib/utils'

export type FloorPerspectiveLine = {
  label: string
  detail?: string
  emphasis?: boolean
}

type FloorPerspectiveProps = {
  lines?: FloorPerspectiveLine[]
  className?: string
}

function Plate({ src, left, top }: { src: string; left: number; top: number }) {
  return <img alt="" src={src} className="pointer-events-none absolute max-w-none" style={{ left, top }} />
}

export function FloorPerspective({ lines = [], className }: FloorPerspectiveProps) {
  return (
    <div className={cn('flex items-center gap-6 overflow-hidden rounded-md bg-muted px-4 py-3', className)}>
      <div className="relative h-[110px] w-[220px] shrink-0" aria-hidden="true">
        <Plate src={slab} left={24} top={82} />
        <Plate src={side} left={169} top={77.8} />
        <Plate src={riser} left={24} top={60.4} />
        <Plate src={slab} left={24} top={56} />
        <Plate src={side} left={169} top={51.8} />
        <Plate src={riser} left={24} top={34.4} />
        <Plate src={topSlab} left={24} top={30} />
        <Plate src={topSide} left={169} top={25.8} />
        <Plate src={roof} left={24} top={8.4} />
        <Plate src={unit} left={29.2} top={20.39} />
        <Plate src={unit} left={101.7} top={29.09} />
        <Plate src={unit} left={51.7} top={9.59} />
        <Plate src={unit} left={124.2} top={18.29} />
      </div>
      {lines.length > 0 ? (
        <ul className="flex min-w-0 flex-col gap-2">
          {lines.map((line) => (
            <li key={line.label} className="min-w-0">
              <p className={cn('truncate text-xs', line.emphasis ? 'text-primary' : 'text-muted-foreground')}>
                {line.label}
              </p>
              {line.detail ? <p className="truncate text-[10px] text-primary">{line.detail}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
