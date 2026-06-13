import { useEffect, useState } from 'react'
import { MapPinIcon } from 'lucide-react'
import { formatPrice } from '@/apps/builder/lib/format-price'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { publicMediaUrl, type PublicBuildingListItem } from '@/lib/api'
import { cn } from '@/lib/utils'

type BuildingCardProps = {
  building: PublicBuildingListItem
  onSelect: (id: number) => void
}

function formatLocation(city: string | null, state: string | null): string {
  const parts = [city, state].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : 'Localização sob consulta'
}

export function BuildingCard({ building, onSelect }: BuildingCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const coverUrl = building.cover_image ? publicMediaUrl(building.cover_image.url) : null
  const cheapest = building.cheapest_unit

  useEffect(() => {
    setImageLoaded(false)
    setImageFailed(false)
  }, [coverUrl])

  return (
    <button
      type="button"
      className="h-full w-full text-left"
      onClick={() => onSelect(building.id)}
    >
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {coverUrl && !imageFailed ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
              )}
              <img
                key={`${building.id}-${building.cover_image?.id ?? 'none'}`}
                src={coverUrl}
                alt={building.name}
                className={cn(
                  'size-full object-cover transition-opacity duration-300',
                  imageLoaded ? 'opacity-100' : 'opacity-0',
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageFailed(true)}
              />
            </>
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-sm text-muted-foreground">
              Sem imagem
            </div>
          )}
          {building.units_count != null && building.units_count > 0 && (
            <Badge className="absolute right-3 top-3" variant="secondary">
              {building.units_count} unidades
            </Badge>
          )}
        </div>

        <CardHeader>
          <CardTitle className="text-lg">{building.name}</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
            {formatLocation(building.city, building.state)}
          </CardDescription>
        </CardHeader>

        {building.description && (
          <CardContent className="-mt-2">
            <p className="line-clamp-2 text-sm text-muted-foreground">{building.description}</p>
          </CardContent>
        )}

        <CardFooter className="mt-auto flex-col items-start gap-1">
          {cheapest ? (
            <>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">A partir de</p>
              <p className="text-lg font-semibold text-foreground">{formatPrice(cheapest.price)}</p>
              <p className="text-xs text-muted-foreground">
                Unidade {cheapest.code}
                {cheapest.area_m2 ? ` · ${cheapest.area_m2} m²` : ''}
                {cheapest.floor != null ? ` · ${cheapest.floor}º andar` : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Consulte disponibilidade e valores</p>
          )}
        </CardFooter>
      </Card>
    </button>
  )
}
