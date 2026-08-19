import { useCallback, useEffect, useRef, useState } from 'react'
import { FileIcon, Trash2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  builderApi,
  type BuildingMedia,
  type BuildingMediaCategory,
} from '@/lib/api'

type BuildingMediaGalleryProps = {
  buildingId: number
  showFloorPlans?: boolean
}

type ImageTab = 'internal' | 'external'

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

function MediaPreview({
  buildingId,
  media,
}: {
  buildingId: number
  media: BuildingMedia
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isImageMime(media.mime_type)) {
      return
    }

    let cancelled = false

    void builderApi.fetchBuildingMediaBlob(buildingId, media.id).then((blob) => {
      if (cancelled || typeof URL.createObjectURL !== 'function') {
        return
      }

      const url = URL.createObjectURL(blob)
      previewUrlRef.current = url
      setPreviewUrl(url)
    })

    return () => {
      cancelled = true
      if (previewUrlRef.current && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
    }
  }, [buildingId, media.id, media.mime_type])

  if (!isImageMime(media.mime_type)) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-md border bg-muted/40">
        <FileIcon className="size-8 text-muted-foreground" />
      </div>
    )
  }

  if (!previewUrl) {
    return <div className="aspect-video animate-pulse rounded-md border bg-muted/40" />
  }

  return (
    <img
      src={previewUrl}
      alt={media.original_name}
      className="aspect-video w-full rounded-md border object-cover"
    />
  )
}

function UploadButton({
  label,
  accept,
  multiple,
  disabled,
  onFilesSelected,
}: {
  label: string
  accept: string
  multiple?: boolean
  disabled?: boolean
  onFilesSelected: (files: FileList | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          onFilesSelected(e.target.files)
          e.target.value = ''
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  )
}

function MediaGrid({
  buildingId,
  items,
  showPublish,
  onPublishChange,
  onDelete,
  onOpenPdf,
}: {
  buildingId: number
  items: BuildingMedia[]
  showPublish: boolean
  onPublishChange: (media: BuildingMedia, published: boolean) => void
  onDelete: (media: BuildingMedia) => void
  onOpenPdf: (media: BuildingMedia) => void
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum arquivo enviado.</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((media) => (
        <div key={media.id} className="space-y-2 rounded-lg border p-3">
          <MediaPreview buildingId={buildingId} media={media} />
          <p className="truncate text-sm font-medium">{media.original_name}</p>

          {showPublish ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={media.published}
                onCheckedChange={(checked) => onPublishChange(media, checked === true)}
              />
              Publicar no portal
            </label>
          ) : null}

          {!showPublish && media.mime_type === 'application/pdf' ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenPdf(media)}>
              Abrir PDF
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onDelete(media)}
          >
            <Trash2Icon className="size-4" />
            Excluir
          </Button>
        </div>
      ))}
    </div>
  )
}

export function BuildingMediaGallery({ buildingId, showFloorPlans = true }: BuildingMediaGalleryProps) {
  const [media, setMedia] = useState<BuildingMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageTab, setImageTab] = useState<ImageTab>('internal')

  const loadMedia = useCallback(async () => {
    try {
      setError(null)
      setMedia(await builderApi.listBuildingMedia(buildingId))
    } catch {
      setError('Não foi possível carregar a galeria.')
    } finally {
      setLoading(false)
    }
  }, [buildingId])

  useEffect(() => {
    void loadMedia()
  }, [loadMedia])

  async function handleUpload(category: BuildingMediaCategory, files: FileList | null) {
    if (!files || files.length === 0) {
      return
    }

    setUploading(true)
    setError(null)

    try {
      const uploads = Array.from(files).map((file) =>
        builderApi.uploadBuildingMedia(buildingId, file, category),
      )
      const created = await Promise.all(uploads)
      setMedia((current) => [...current, ...created])
    } catch {
      setError('Não foi possível enviar o arquivo.')
    } finally {
      setUploading(false)
    }
  }

  async function handlePublishChange(item: BuildingMedia, published: boolean) {
    try {
      const updated = await builderApi.updateBuildingMedia(buildingId, item.id, { published })
      setMedia((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
    } catch {
      setError('Não foi possível atualizar a publicação.')
    }
  }

  async function handleDelete(item: BuildingMedia) {
    try {
      await builderApi.deleteBuildingMedia(buildingId, item.id)
      setMedia((current) => current.filter((entry) => entry.id !== item.id))
    } catch {
      setError('Não foi possível excluir o arquivo.')
    }
  }

  async function handleOpenPdf(item: BuildingMedia) {
    try {
      const blob = await builderApi.fetchBuildingMediaBlob(buildingId, item.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setError('Não foi possível abrir o PDF.')
    }
  }

  const internalMedia = media.filter((item) => item.category === 'internal')
  const externalMedia = media.filter((item) => item.category === 'external')
  const floorPlanMedia = media.filter((item) => item.category === 'floor_plan')

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="text-base font-semibold">Galeria de mídias</h2>
        <p className="text-sm text-muted-foreground">
          Imagens internas e externas podem ser publicadas no portal. Plantas ficam restritas à
          construtora e ao corretor.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Carregando galeria...</p> : null}

      <Tabs defaultValue="images">
        <TabsList>
          <TabsTrigger value="images">Imagens</TabsTrigger>
          {showFloorPlans ? <TabsTrigger value="floor_plans">Plantas</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="images" className="mt-4 space-y-4">
          <Tabs value={imageTab} onValueChange={(value) => setImageTab(value as ImageTab)}>
            <TabsList>
              <TabsTrigger value="internal">Internas</TabsTrigger>
              <TabsTrigger value="external">Externas</TabsTrigger>
            </TabsList>

            <TabsContent value="internal" className="mt-4 space-y-4">
              <UploadButton
                label={uploading ? 'Enviando...' : 'Enviar imagens internas'}
                accept="image/*"
                multiple
                disabled={uploading}
                onFilesSelected={(files) => {
                  void handleUpload('internal', files)
                }}
              />

              <MediaGrid
                buildingId={buildingId}
                items={internalMedia}
                showPublish
                onPublishChange={handlePublishChange}
                onDelete={handleDelete}
                onOpenPdf={handleOpenPdf}
              />
            </TabsContent>

            <TabsContent value="external" className="mt-4 space-y-4">
              <UploadButton
                label={uploading ? 'Enviando...' : 'Enviar imagens externas'}
                accept="image/*"
                multiple
                disabled={uploading}
                onFilesSelected={(files) => {
                  void handleUpload('external', files)
                }}
              />

              <MediaGrid
                buildingId={buildingId}
                items={externalMedia}
                showPublish
                onPublishChange={handlePublishChange}
                onDelete={handleDelete}
                onOpenPdf={handleOpenPdf}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {showFloorPlans ? (
          <TabsContent value="floor_plans" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Restrito à construtora e corretor</Badge>
              <UploadButton
                label={uploading ? 'Enviando...' : 'Enviar plantas (imagem ou PDF)'}
                accept="image/*,.pdf,application/pdf"
                multiple
                disabled={uploading}
                onFilesSelected={(files) => {
                  void handleUpload('floor_plan', files)
                }}
              />
            </div>

            <MediaGrid
              buildingId={buildingId}
              items={floorPlanMedia}
              showPublish={false}
              onPublishChange={handlePublishChange}
              onDelete={handleDelete}
              onOpenPdf={handleOpenPdf}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
