import { useEffect, useState } from 'react'
import { DownloadIcon, FileTextIcon, ImageIcon } from 'lucide-react'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { fetchAuthenticatedBlob, type ReservationAttachment } from '@/lib/api'
import {
  blobForPreview,
  downloadReservationAttachment,
} from '@/components/reservations/download-reservation-attachment'

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

function isPdfAttachment(attachment: ReservationAttachment): boolean {
  return attachment.mime_type === 'application/pdf' || attachment.kind === 'contract_pdf'
}

export function ReservationAttachmentPreview({
  attachment,
  className,
}: ReservationAttachmentPreviewProps) {
  const isImage = attachment.mime_type.startsWith('image/')
  const isPdf = isPdfAttachment(attachment)

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
        {isPdf ? (
          <AttachmentActions>
            <AttachmentAction
              aria-label={`Baixar ${attachment.original_name}`}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                void downloadReservationAttachment(attachment)
              }}
            >
              <DownloadIcon />
            </AttachmentAction>
          </AttachmentActions>
        ) : null}
      </Attachment>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{attachment.original_name}</DialogTitle>
          <DialogDescription>
            {isPdf
              ? 'Visualize o contrato e baixe o PDF para enviar ao cliente.'
              : 'Visualização do anexo enviado na reserva.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <AttachmentPreviewBody attachment={attachment} />
        </DialogBody>
        {isPdf ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => void downloadReservationAttachment(attachment)}
            >
              <DownloadIcon data-icon="inline-start" />
              Baixar PDF
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function AttachmentPreviewBody({ attachment }: { attachment: ReservationAttachment }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const isPdf = isPdfAttachment(attachment)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    void fetchAuthenticatedBlob(attachment.file_url)
      .then((blob) => {
        const url = URL.createObjectURL(blobForPreview(blob, attachment.mime_type))

        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }

        objectUrl = url
        setPreviewUrl(url)
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
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [attachment.file_url, attachment.mime_type])

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

  if (isPdf) {
    return (
      <iframe
        title={attachment.original_name}
        src={previewUrl}
        className="h-[70vh] w-full rounded-lg border bg-muted"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Pré-visualização indisponível para este formato. Use o botão abaixo para abrir o arquivo.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={() => void downloadReservationAttachment(attachment)}
      >
        <DownloadIcon data-icon="inline-start" />
        Baixar arquivo
      </Button>
    </div>
  )
}
