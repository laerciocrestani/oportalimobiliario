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

type BrokerDepositProofDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  onSubmitted: () => void
}

export function BrokerDepositProofDialog({
  open,
  onOpenChange,
  reservationId,
  onSubmitted,
}: BrokerDepositProofDialogProps) {
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
      await brokerApi.uploadDepositProof(reservationId, fileItem.file)
      setFiles([])
      onOpenChange(false)
      onSubmitted()
    } catch {
      setError('Não foi possível enviar o comprovante.')
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
          <DialogTitle>Enviar comprovante de sinal</DialogTitle>
          <DialogDescription>
            Anexe o comprovante de pagamento do sinal. Formatos aceitos: PDF, JPEG, PNG ou WebP (até 10MB).
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <ReservationAttachmentField
          files={files}
          onFilesChange={setFiles}
          disabled={submitting}
          emptyLabel="Selecionar comprovante"
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            disabled={files.length === 0 || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Enviando...' : 'Enviar comprovante'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
