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

type BuilderWitnessSignDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  slot: number
  onSubmitted: () => void
}

export function BuilderWitnessSignDialog({
  open,
  onOpenChange,
  reservationId,
  slot,
  onSubmitted,
}: BuilderWitnessSignDialogProps) {
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
      await builderApi.signAsWitness(reservationId, slot)
      onOpenChange(false)
      onSubmitted()
    } catch {
      setError('Não foi possível registrar a assinatura da testemunha.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar assinatura da testemunha {slot}</DialogTitle>
          <DialogDescription>
            Confirme o registro da sua assinatura neste contrato. A ação fica gravada no andamento
            da reserva.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Registrando...' : 'Registrar assinatura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
