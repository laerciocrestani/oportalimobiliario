import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { brokerApi, type BrokerClient, type ReservationProposalInput, type ReservationTimelineClient, type Unit } from '@/lib/api'

type BrokerReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit: Unit | null
  reservationId: number | null
  expiresAt: string | null
  onReserved: () => void
  releaseHoldOnClose?: boolean
  client?: BrokerClient | ReservationTimelineClient | null
}

const EMPTY_FORM: ReservationProposalInput = {
  client_name: '',
  client_email: '',
  client_phone: '',
  client_cpf: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  marital_status: '',
  nationality: 'brasileira',
  land_value: 0,
  payment_terms: '',
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

export function BrokerReservationDialog({
  open,
  onOpenChange,
  unit,
  reservationId,
  expiresAt,
  onReserved,
  releaseHoldOnClose = true,
  client = null,
}: BrokerReservationDialogProps) {
  const [clients, setClients] = useState<BrokerClient[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [form, setForm] = useState<ReservationProposalInput>(EMPTY_FORM)
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [remainingTime, setRemainingTime] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    if (client) {
      setForm((current) => ({
        ...current,
        client_name: client.name,
        client_email: client.email ?? '',
        client_phone: client.phone,
      }))
      return
    }

    void brokerApi
      .listClients()
      .then(setClients)
      .catch(() => setError('Não foi possível carregar os clientes.'))
  }, [client, open])

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
    setForm(EMPTY_FORM)
    setError(null)
    setNewClientOpen(false)
    setExpired(false)
    setRemainingTime(null)
  }

  function updateField<K extends keyof ReservationProposalInput>(
    key: K,
    value: ReservationProposalInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleClientSelect(clientId: string) {
    setSelectedClientId(clientId)
    const client = clients.find((item) => String(item.id) === clientId)
    if (!client) {
      return
    }

    setForm((current) => ({
      ...current,
      client_name: client.name,
      client_email: client.email ?? '',
      client_phone: client.phone,
    }))
  }

  async function releaseHoldIfNeeded() {
    if (!reservationId) {
      return
    }

    try {
      await brokerApi.releasePreHold(reservationId)
    } catch {
      // Hold pode ter expirado ou já ter sido enviado.
    }
  }

  async function handleClose() {
    if (releaseHoldOnClose && reservationId && !submitting) {
      await releaseHoldIfNeeded()
    }

    resetState()
    onOpenChange(false)
  }

  async function handleSubmit() {
    if (!unit || !reservationId || expired) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await brokerApi.submitReservationProposal(reservationId, {
        ...form,
        land_value: Number(form.land_value),
      })
      resetState()
      onOpenChange(false)
      onReserved()
    } catch {
      setError('Não foi possível enviar a proposta. Verifique se a pré-reserva ainda está válida.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClientCreated(client: BrokerClient) {
    setClients((current) => [...current, client].sort((a, b) => a.name.localeCompare(b.name)))
    handleClientSelect(String(client.id))
  }

  const canSubmit =
    form.client_name.trim() !== '' &&
    form.client_email.trim() !== '' &&
    form.client_phone.trim() !== '' &&
    form.client_cpf.trim().length === 11 &&
    form.address.trim() !== '' &&
    form.city.trim() !== '' &&
    form.state.trim().length === 2 &&
    form.zip.trim() !== '' &&
    form.marital_status.trim() !== '' &&
    form.nationality.trim() !== '' &&
    form.payment_terms.trim() !== '' &&
    Number(form.land_value) > 0

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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar proposta</DialogTitle>
            <DialogDescription>
              {unit
                ? `Unidade ${unit.code} — complete os dados da proposta para envio à construtora.`
                : 'Preencha a proposta para envio à construtora.'}
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
            {client ? (
              <p className="text-sm text-muted-foreground">
                Cliente da pré-reserva:{' '}
                <span className="font-medium text-foreground">
                  {client.name}
                  {client.phone ? ` · ${client.phone}` : ''}
                </span>
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="proposal-client">Cliente cadastrado</Label>
                  <select
                    id="proposal-client"
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={selectedClientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    disabled={expired}
                  >
                    <option value="">Preencher manualmente</option>
                    {clients.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name} · {item.phone}
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
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="proposal-name">Nome do cliente *</Label>
                <Input
                  id="proposal-name"
                  value={form.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposal-email">E-mail *</Label>
                <Input
                  id="proposal-email"
                  type="email"
                  value={form.client_email}
                  onChange={(e) => updateField('client_email', e.target.value)}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposal-phone">Telefone *</Label>
                <Input
                  id="proposal-phone"
                  value={form.client_phone}
                  onChange={(e) => updateField('client_phone', e.target.value)}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposal-cpf">CPF *</Label>
                <Input
                  id="proposal-cpf"
                  value={form.client_cpf}
                  onChange={(e) => updateField('client_cpf', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposal-marital">Estado civil *</Label>
                <Input
                  id="proposal-marital"
                  value={form.marital_status}
                  onChange={(e) => updateField('marital_status', e.target.value)}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="proposal-address">Endereço *</Label>
                <Input
                  id="proposal-address"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposal-city">Cidade *</Label>
                <Input
                  id="proposal-city"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposal-state">UF *</Label>
                <Input
                  id="proposal-state"
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value.toUpperCase().slice(0, 2))}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposal-zip">CEP *</Label>
                <Input
                  id="proposal-zip"
                  value={form.zip}
                  onChange={(e) => updateField('zip', e.target.value)}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposal-nationality">Nacionalidade *</Label>
                <Input
                  id="proposal-nationality"
                  value={form.nationality}
                  onChange={(e) => updateField('nationality', e.target.value)}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposal-land-value">Valor do terreno *</Label>
                <Input
                  id="proposal-land-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.land_value || ''}
                  onChange={(e) => updateField('land_value', Number(e.target.value))}
                  disabled={expired}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="proposal-payment">Condições de pagamento *</Label>
                <textarea
                  id="proposal-payment"
                  className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={form.payment_terms}
                  onChange={(e) => updateField('payment_terms', e.target.value)}
                  placeholder="Ex: Pix R$ 10.000 + terreno + 24x R$ 5.000"
                  disabled={expired}
                />
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            disabled={!canSubmit || submitting || expired}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Enviando...' : 'Enviar proposta'}
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
