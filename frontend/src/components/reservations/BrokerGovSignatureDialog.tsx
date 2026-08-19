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
import { brokerApi } from '@/lib/api'

type BrokerGovSignatureDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  onSubmitted: () => void
}

export function BrokerGovSignatureDialog({
  open,
  onOpenChange,
  reservationId,
  onSubmitted,
}: BrokerGovSignatureDialogProps) {
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
      await brokerApi.markContractGovSigned(reservationId, note)
      setNote('')
      onOpenChange(false)
      onSubmitted()
    } catch {
      setError('Não foi possível registrar a assinatura no GOV.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar assinatura GOV</DialogTitle>
          <DialogDescription>
            Confirme que o cliente e o corretor já assinaram o contrato no GOV. Não há integração
            automática nesta versão.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gov-note">Observação (opcional)</Label>
            <textarea
              id="gov-note"
              className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex.: Assinado em 19/08 no GOV.br"
              disabled={submitting}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Registrando...' : 'Confirmar assinatura GOV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
