import { useEffect, useState } from 'react'
import { unitStatusLabels } from '@/apps/builder/lib/unit-status'
import { BrokerNewClientDialog } from '@/apps/broker/components/BrokerNewClientDialog'
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
import { brokerApi, type BrokerClient, type Unit } from '@/lib/api'

type BrokerPreHoldDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit: Unit | null
  reservationId: number | null
  expiresAt: string | null
  onReserved: () => void
}

function formatRemainingTime(expiresAt: string): string {
  const remainingMs = new Date(expiresAt).getTime() - Date.now()
  if (remainingMs <= 0) {
    return '0:00'
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function BrokerPreHoldDialog({
  open,
  onOpenChange,
  unit,
  reservationId,
  expiresAt,
  onReserved,
}: BrokerPreHoldDialogProps) {
  const [clients, setClients] = useState<BrokerClient[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [observations, setObservations] = useState('')
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [remainingTime, setRemainingTime] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    void brokerApi
      .listClients()
      .then(setClients)
      .catch(() => setError('Não foi possível carregar os clientes.'))
  }, [open])

  useEffect(() => {
    if (!open || !expiresAt) {
      setRemainingTime(null)
      setExpired(false)
      return
    }

    function tick() {
      const isExpired = new Date(expiresAt).getTime() <= Date.now()
      setExpired(isExpired)
      setRemainingTime(formatRemainingTime(expiresAt))
    }

    tick()
    const intervalId = window.setInterval(tick, 1000)

    return () => window.clearInterval(intervalId)
  }, [expiresAt, open])

  function resetState() {
    setSelectedClientId('')
    setObservations('')
    setError(null)
    setNewClientOpen(false)
    setExpired(false)
    setRemainingTime(null)
  }

  async function releaseHoldIfNeeded() {
    if (!reservationId) {
      return
    }

    try {
      await brokerApi.releasePreHold(reservationId)
    } catch {
      // Hold pode ter expirado ou já ter sido confirmado.
    }
  }

  async function handleClose() {
    if (reservationId && !submitting) {
      await releaseHoldIfNeeded()
    }

    resetState()
    onOpenChange(false)
  }

  async function handleConfirm() {
    if (!unit || !selectedClientId || !reservationId || expired) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await brokerApi.attachPreHoldClient(
        reservationId,
        Number(selectedClientId),
        observations.trim() || undefined,
      )
      resetState()
      onOpenChange(false)
      onReserved()
    } catch {
      setError('Não foi possível confirmar a pré-reserva. Verifique se ela ainda está válida.')
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
            void handleClose()
            return
          }

          onOpenChange(nextOpen)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pré-reserva</DialogTitle>
            <DialogDescription>
              {unit
                ? `Unidade ${unit.code} · ${unitStatusLabels[unit.status as keyof typeof unitStatusLabels] ?? unit.status}`
                : 'Selecione o cliente para confirmar a pré-reserva.'}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {remainingTime ? (
              <p className="text-sm text-muted-foreground">
                Tempo restante da pré-reserva: {remainingTime}
              </p>
            ) : null}

            {expired ? (
              <p className="text-sm text-destructive">
                Sua pré-reserva expirou. Feche este dialog e tente novamente.
              </p>
            ) : null}

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pre-hold-client">Cliente *</Label>
                <select
                  id="pre-hold-client"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  disabled={expired}
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={String(client.id)}>
                      {client.name} · {client.phone}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={expired}
                onClick={() => setNewClientOpen(true)}
              >
                Novo cliente
              </Button>

              <div className="flex flex-col gap-2">
                <Label htmlFor="pre-hold-observations">Observações</Label>
                <textarea
                  id="pre-hold-observations"
                  className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Informações adicionais para a construtora (opcional)"
                  disabled={expired}
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => void handleClose()}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!selectedClientId || submitting || expired}
              onClick={() => void handleConfirm()}
            >
              {submitting ? 'Confirmando...' : 'Confirmar pré-reserva'}
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
