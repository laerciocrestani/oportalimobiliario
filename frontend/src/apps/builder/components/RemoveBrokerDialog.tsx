import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { LinkedBroker } from '@/lib/api'

type RemoveBrokerDialogProps = {
  broker: LinkedBroker | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  submitting: boolean
}

export function RemoveBrokerDialog({
  broker,
  open,
  onOpenChange,
  onConfirm,
  submitting,
}: RemoveBrokerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remover corretor?</DialogTitle>
          <DialogDescription>
            {broker
              ? `O vínculo de ${broker.name} com sua construtora será removido permanentemente. O corretor perderá acesso aos empreendimentos liberados e não aparecerá mais na lista.`
              : 'O vínculo será removido permanentemente.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={submitting} onClick={onConfirm}>
            {submitting ? 'Removendo...' : 'Remover vínculo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
