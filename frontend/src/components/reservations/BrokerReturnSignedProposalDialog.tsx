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

type BrokerReturnSignedProposalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  onSubmitted: () => void
}

export function BrokerReturnSignedProposalDialog({
  open,
  onOpenChange,
  reservationId,
  onSubmitted,
}: BrokerReturnSignedProposalDialogProps) {
  const [signedFiles, setSignedFiles] = useState<ReservationFileItem[]>([])
  const [depositFiles, setDepositFiles] = useState<ReservationFileItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setSignedFiles([])
      setDepositFiles([])
      setError(null)
    }

    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    const signed = signedFiles[0]
    if (!signed) {
      return
    }

    setSubmitting(true)
    setError(null)
    setSignedFiles((current) =>
      current.map((item) => (item.id === signed.id ? { ...item, state: 'uploading' } : item)),
    )

    try {
      await brokerApi.returnSignedProposal(reservationId, signed.file, depositFiles[0]?.file)
      setSignedFiles([])
      setDepositFiles([])
      onOpenChange(false)
      onSubmitted()
    } catch {
      setError('Não foi possível devolver a proposta assinada.')
      setSignedFiles((current) =>
        current.map((item) =>
          item.id === signed.id
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
          <DialogTitle>Devolver proposta assinada</DialogTitle>
          <DialogDescription>
            Envie o PDF assinado pelo comprador e pela construtora. O comprovante de sinal é opcional.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <ReservationAttachmentField
            files={signedFiles}
            onFilesChange={setSignedFiles}
            accept="application/pdf"
            disabled={submitting}
            emptyLabel="Selecionar PDF assinado por ambas as partes"
          />

          <ReservationAttachmentField
            files={depositFiles}
            onFilesChange={setDepositFiles}
            disabled={submitting}
            emptyLabel="Comprovante de sinal (opcional)"
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            disabled={signedFiles.length === 0 || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Enviando...' : 'Enviar devolução'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
