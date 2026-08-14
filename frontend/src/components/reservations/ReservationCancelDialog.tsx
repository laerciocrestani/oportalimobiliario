import { useEffect, useState } from 'react'
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

type ReservationCancelDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientName?: string | null
  onConfirm: (reason: string) => Promise<void>
}

export function ReservationCancelDialog({
  open,
  onOpenChange,
  clientName,
  onConfirm,
}: ReservationCancelDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setReason('')
    setError(null)
    setSubmitting(false)
  }, [open])

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setReason('')
      setError(null)
      setSubmitting(false)
    }

    onOpenChange(nextOpen)
  }

  const trimmedReason = reason.trim()
  const canSubmit = trimmedReason !== '' && !submitting

  async function handleSubmit() {
    if (!canSubmit) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onConfirm(trimmedReason)
      handleClose(false)
    } catch {
      setError('Não foi possível cancelar a reserva.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancelar reserva</DialogTitle>
          <DialogDescription>
            {clientName
              ? `A reserva de ${clientName} será cancelada e a unidade voltará a ficar disponível.`
              : 'A reserva será cancelada e a unidade voltará a ficar disponível.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reservation-cancel-reason">Motivo *</FieldLabel>
              <Textarea
                id="reservation-cancel-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={submitting}
                maxLength={2000}
              />
              <FieldDescription>Esse motivo fica registrado no andamento da reserva.</FieldDescription>
            </Field>
          </FieldGroup>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="destructive" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {submitting ? 'Cancelando...' : 'Cancelar reserva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
