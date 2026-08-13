import { useEffect, useState } from 'react'
import { FileTextIcon, ImageIcon } from 'lucide-react'
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { fetchAuthenticatedBlob, type ReservationAttachment } from '@/lib/api'

type ReservationAttachmentPreviewProps = {
  attachment: ReservationAttachment
  className?: string
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
}

export function ReservationAttachmentPreview({
  attachment,
  className,
}: ReservationAttachmentPreviewProps) {
  const isImage = attachment.mime_type.startsWith('image/')

  return (
    <Dialog>
      <Attachment className={className ?? 'w-full'}>
        <AttachmentMedia>
          {isImage ? <ImageIcon /> : <FileTextIcon />}
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{attachment.original_name}</AttachmentTitle>
          <AttachmentDescription>
            {attachment.mime_type.split('/').pop()?.toUpperCase()} · {formatBytes(attachment.size_bytes)}
          </AttachmentDescription>
        </AttachmentContent>
        <DialogTrigger
          render={
            <AttachmentTrigger aria-label={`Abrir ${attachment.original_name}`} />
          }
        />
      </Attachment>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{attachment.original_name}</DialogTitle>
          <DialogDescription>Visualização do anexo enviado na reserva.</DialogDescription>
        </DialogHeader>
        <AttachmentPreviewBody attachment={attachment} />
      </DialogContent>
    </Dialog>
  )
}

function AttachmentPreviewBody({ attachment }: { attachment: ReservationAttachment }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void fetchAuthenticatedBlob(attachment.file_url)
      .then((blob) => {
        if (!cancelled) {
          setPreviewUrl(URL.createObjectURL(blob))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Não foi possível carregar o arquivo.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [attachment.file_url])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando arquivo...</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!previewUrl) {
    return null
  }

  if (attachment.mime_type.startsWith('image/')) {
    return (
      <img
        src={previewUrl}
        alt={attachment.original_name}
        className="max-h-[70vh] w-full rounded-lg object-contain"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Pré-visualização indisponível para este formato. Use o botão abaixo para abrir o arquivo.
      </p>
      <a
        href={previewUrl}
        download={attachment.original_name}
        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
      >
        Baixar arquivo
      </a>
    </div>
  )
}
