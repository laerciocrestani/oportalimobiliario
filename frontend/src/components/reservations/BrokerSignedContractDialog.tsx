import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ReservationAttachmentField,
  type ReservationFileItem,
} from '@/components/reservations/ReservationAttachmentField'
import { brokerApi } from '@/lib/api'

type BrokerSignedContractDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  onSubmitted: () => void
}

export function BrokerSignedContractDialog({
  open,
  onOpenChange,
  reservationId,
  onSubmitted,
}: BrokerSignedContractDialogProps) {
  const [files, setFiles] = useState<ReservationFileItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setFiles([])
      setError(null)
    }

    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    const fileItem = files[0]
    if (!fileItem) {
      return
    }

    setSubmitting(true)
    setError(null)
    setFiles((current) =>
      current.map((item) => (item.id === fileItem.id ? { ...item, state: 'uploading' } : item)),
    )

    try {
      await brokerApi.uploadSignedContract(reservationId, fileItem.file)
      setFiles([])
      onOpenChange(false)
      onSubmitted()
    } catch {
      setError('Não foi possível enviar o contrato assinado. Confirme o PDF e a assinatura GOV.')
      setFiles((current) =>
        current.map((item) =>
          item.id === fileItem.id
            ? { ...item, state: 'error', errorMessage: 'Falha no envio' }
            : item,
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar contrato assinado</DialogTitle>
          <DialogDescription>
            Anexe o PDF do contrato assinado no GOV (até 10MB).
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <ReservationAttachmentField
            files={files}
            onFilesChange={setFiles}
            accept="application/pdf"
            disabled={submitting}
            emptyLabel="Selecionar PDF assinado"
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            disabled={files.length === 0 || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Enviando...' : 'Enviar contrato assinado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
