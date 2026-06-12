import { useEffect, useState } from 'react'
import { unitStatusLabels } from '@/apps/builder/lib/unit-status'
import { BrokerNewClientDialog } from '@/apps/broker/components/BrokerNewClientDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { brokerApi, type BrokerClient, type Unit } from '@/lib/api'

type BrokerReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit: Unit | null
  onReserved: () => void
}

export function BrokerReservationDialog({
  open,
  onOpenChange,
  unit,
  onReserved,
}: BrokerReservationDialogProps) {
  const [clients, setClients] = useState<BrokerClient[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    void brokerApi
      .listClients()
      .then(setClients)
      .catch(() => setError('Não foi possível carregar os clientes.'))
  }, [open])

  function resetState() {
    setSelectedClientId('')
    setError(null)
    setNewClientOpen(false)
  }

  async function handleReserve() {
    if (!unit || !selectedClientId) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await brokerApi.createReservation(unit.id, Number(selectedClientId))
      resetState()
      onOpenChange(false)
      onReserved()
    } catch {
      setError('Não foi possível criar a reserva.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClientCreated(client: BrokerClient) {
    setClients((current) => [...current, client].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedClientId(String(client.id))
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            resetState()
          }
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar unidade</DialogTitle>
            <DialogDescription>
              {unit
                ? `Unidade ${unit.code} · ${unitStatusLabels[unit.status as keyof typeof unitStatusLabels] ?? unit.status}`
                : 'Selecione o cliente para concluir a reserva.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reservation-client">Cliente *</Label>
              <select
                id="reservation-client"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={String(client.id)}>
                    {client.name} · {client.phone}
                  </option>
                ))}
              </select>
            </div>

            <Button type="button" variant="outline" onClick={() => setNewClientOpen(true)}>
              Novo cliente
            </Button>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!selectedClientId || submitting}
              onClick={() => void handleReserve()}
            >
              Confirmar reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BrokerNewClientDialog
        open={newClientOpen}
        onOpenChange={setNewClientOpen}
        onCreated={handleClientCreated}
      />
    </>
  )
}
