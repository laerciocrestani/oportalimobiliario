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

type BuilderMarkSoldDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  onSubmitted: () => void
}

export function BuilderMarkSoldDialog({
  open,
  onOpenChange,
  reservationId,
  onSubmitted,
}: BuilderMarkSoldDialogProps) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setNote('')
      setError(null)
    }

    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    try {
      await builderApi.validateSignedContract(reservationId, note)
      setNote('')
      onOpenChange(false)
      onSubmitted()
    } catch {
      setError('Não foi possível concluir a venda da unidade.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Unidade vendida</DialogTitle>
          <DialogDescription>
            Confirme que o contrato está assinado pelo comprador e pela construtora. A unidade será
            marcada como vendida.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sold-note">Observação (opcional)</Label>
            <textarea
              id="sold-note"
              className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex.: Documentos conferidos em 21/08."
              disabled={submitting}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Confirmando...' : 'Unidade vendida'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
