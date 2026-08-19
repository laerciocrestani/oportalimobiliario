import { cn } from '@/lib/utils'

export type MassingTower = {
  name: string
  floorsCount: number
}

type BuildingMassingProps = {
  towers: MassingTower[]
  selectedTowerIndex: number
  selectedFloor?: number | null
  onSelectTower: (index: number) => void
  onSelectFloor?: (towerIndex: number, floor: number) => void
}

export function BuildingMassing({
  towers,
  selectedTowerIndex,
  selectedFloor = null,
  onSelectTower,
  onSelectFloor,
}: BuildingMassingProps) {
  const maxFloors = Math.max(1, ...towers.map((tower) => tower.floorsCount))
  const floorHeight = maxFloors > 24 ? 6 : maxFloors > 12 ? 10 : 14

  return (
    <div data-testid="building-massing" className="rounded-xl bg-muted/40 p-6">
      <div
        className="flex items-end justify-center gap-6 overflow-x-auto pt-4 pb-2"
        style={{ perspective: '900px' }}
      >
        {towers.map((tower, towerIndex) => {
          const selected = towerIndex === selectedTowerIndex
          const floors = Array.from({ length: Math.max(1, tower.floorsCount) }, (_, index) => index + 1)

          return (
            <div key={`${tower.name}-${towerIndex}`} className="flex min-w-16 flex-col items-center gap-2">
              <div
                className="relative origin-bottom"
                style={{
                  transform: 'rotateX(8deg) rotateY(-18deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div
                  aria-hidden
                  className={cn(
                    'absolute top-1 right-0 h-[calc(100%-4px)] w-3 origin-left rounded-r-sm',
                    selected ? 'bg-primary/50' : 'bg-foreground/20',
                  )}
                  style={{ transform: 'rotateY(90deg) translateZ(1px)' }}
                />
                <div className="relative flex flex-col-reverse gap-px overflow-hidden rounded-sm shadow-md">
                  {floors.map((floor) => {
                    const floorSelected = selected && selectedFloor === floor

                    return (
                      <button
                        key={floor}
                        type="button"
                        aria-label={`${tower.name}, andar ${floor}`}
                        aria-pressed={selected && (selectedFloor == null || selectedFloor === floor)}
                        className={cn(
                          'w-16 border border-background/70 transition-colors',
                          selected
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-card hover:bg-muted',
                          floorSelected && 'ring-2 ring-ring ring-inset',
                        )}
                        style={{ height: floorHeight }}
                        onClick={() => {
                          onSelectTower(towerIndex)
                          onSelectFloor?.(towerIndex, floor)
                        }}
                      />
                    )
                  })}
                </div>
              </div>
              <p className={cn('max-w-20 truncate text-center text-xs', selected && 'font-medium text-primary')}>
                {tower.name || `Torre ${towerIndex + 1}`}
              </p>
            </div>
          )
        })}
      </div>
      <div className="mx-auto mt-1 h-2 max-w-xs rounded-full bg-foreground/15" />
    </div>
  )
}
