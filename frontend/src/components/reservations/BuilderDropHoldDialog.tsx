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
import { Label } from '@/components/ui/label'
import { builderApi } from '@/lib/api'

type BuilderDropHoldDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  onSubmitted: () => void
}

export function BuilderDropHoldDialog({
  open,
  onOpenChange,
  reservationId,
  onSubmitted,
}: BuilderDropHoldDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setReason('')
      setError(null)
    }

    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    try {
      await builderApi.dropReservationHold(reservationId, reason)
      setReason('')
      onOpenChange(false)
      onSubmitted()
    } catch {
      setError('Não foi possível encerrar esta pré-reserva.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Encerrar pré-reserva</DialogTitle>
          <DialogDescription>
            A unidade volta a ficar disponível imediatamente. Esta ação não espera o fim das 48h.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-col gap-2">
            <Label htmlFor="drop-hold-reason">Motivo (opcional)</Label>
            <textarea
              id="drop-hold-reason"
              className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: Cliente desistiu da visita."
              disabled={submitting}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? 'Encerrando...' : 'Encerrar agora'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
