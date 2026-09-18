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
import { builderApi } from '@/lib/api'

type BuilderExtendHoldDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  onSubmitted: () => void
}

export function BuilderExtendHoldDialog({
  open,
  onOpenChange,
  reservationId,
  onSubmitted,
}: BuilderExtendHoldDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null)
    }

    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    try {
      await builderApi.extendReservationHold(reservationId)
      onOpenChange(false)
      onSubmitted()
    } catch {
      setError('Não foi possível estender o prazo desta pré-reserva.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Estender prazo da pré-reserva</DialogTitle>
          <DialogDescription>
            Soma 48 horas ao prazo atual. A unidade continua pré-reservada até o sinal, o avanço da
            proposta ou o fim do novo prazo.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Estendendo...' : 'Estender +48h'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
