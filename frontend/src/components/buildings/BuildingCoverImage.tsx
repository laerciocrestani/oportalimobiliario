import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { CoverImage } from '@/lib/api'

type BuildingCoverImageProps = {
  buildingId: number
  coverImage?: CoverImage | null
  alt: string
  fetchBlob: (buildingId: number, mediaId: number) => Promise<Blob>
  className?: string
}

export function BuildingCoverImage({
  buildingId,
  coverImage,
  alt,
  fetchBlob,
  className,
}: BuildingCoverImageProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    setFailed(false)
    setPreviewUrl(null)

    if (!coverImage) {
      return
    }

    let cancelled = false

    void fetchBlob(buildingId, coverImage.id)
      .then((blob) => {
        if (cancelled || typeof URL.createObjectURL !== 'function') {
          return
        }

        const url = URL.createObjectURL(blob)
        previewUrlRef.current = url
        setPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
        }
      })

    return () => {
      cancelled = true
      if (previewUrlRef.current && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
    }
  }, [buildingId, coverImage, fetchBlob])

  return (
    <div className={cn('relative aspect-[4/3] w-full overflow-hidden bg-muted', className)}>
      {coverImage && previewUrl && !failed ? (
        <img src={previewUrl} alt={alt} className="size-full object-cover" />
      ) : coverImage && !failed ? (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-sm text-muted-foreground">
          Sem imagem
        </div>
      )}
    </div>
  )
}
