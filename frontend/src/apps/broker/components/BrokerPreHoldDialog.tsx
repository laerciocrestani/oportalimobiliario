import { useEffect, useState } from 'react'
import { unitStatusLabels } from '@/apps/builder/lib/unit-status'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroupAddon } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { WhatsAppPhoneInput } from '@/components/whatsapp-phone-input'
import { brokerApi, type BrokerClient, type Unit } from '@/lib/api'
import { isValidEmail } from '@/lib/format-phone'

const CLIENT_SEARCH_MIN_LENGTH = 3

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

function sameClient(client: BrokerClient, name: string, phone: string, email: string): boolean {
  return client.name === name && client.phone === phone && (client.email ?? '') === email
}

export function BrokerPreHoldDialog({
  open,
  onOpenChange,
  unit,
  reservationId,
  expiresAt,
  onReserved,
}: BrokerPreHoldDialogProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [selectedClient, setSelectedClient] = useState<BrokerClient | null>(null)
  const [suggestions, setSuggestions] = useState<BrokerClient[]>([])
  const [searching, setSearching] = useState(false)
  const [settledQuery, setSettledQuery] = useState<string | null>(null)
  const [listDismissed, setListDismissed] = useState(false)
  const [observations, setObservations] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [remainingTime, setRemainingTime] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  const query = name.trim()
  const trimmedEmail = email.trim()
  const usingExistingClient =
    selectedClient !== null && sameClient(selectedClient, query, phone, trimmedEmail)
  const emailInvalid = trimmedEmail !== '' && !isValidEmail(trimmedEmail)
  const canConfirm = query.length > 0 && phone.trim().length > 0 && !emailInvalid && !expired && !submitting
  const noClientFound =
    !usingExistingClient && !searching && settledQuery === query && suggestions.length === 0
  const listOpen =
    !listDismissed &&
    query.length >= CLIENT_SEARCH_MIN_LENGTH &&
    suggestions.length > 0 &&
    selectedClient?.name !== query

  useEffect(() => {
    if (!open || query.length < CLIENT_SEARCH_MIN_LENGTH) {
      setSuggestions([])
      setSearching(false)
      setSettledQuery(null)
      return
    }

    let cancelled = false
    setSearching(true)

    const timer = window.setTimeout(() => {
      void brokerApi
        .listClients(query)
        .then((results) => {
          if (cancelled) {
            return
          }

          setSuggestions(results)
          setSettledQuery(query)
        })
        .catch(() => {
          if (cancelled) {
            return
          }

          setSuggestions([])
          setSettledQuery(null)
          setError('Não foi possível buscar clientes.')
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false)
          }
        })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

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
    setName('')
    setPhone('')
    setEmail('')
    setSelectedClient(null)
    setSuggestions([])
    setSearching(false)
    setSettledQuery(null)
    setListDismissed(false)
    setObservations('')
    setError(null)
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

  function handleNameChange(value: string, details: { reason: string }) {
    setName(value)

    if (details.reason !== 'input-change' && details.reason !== 'input-clear') {
      return
    }

    setListDismissed(false)
    setSelectedClient((current) => (current && current.name === value.trim() ? current : null))
  }

  function handleSelectClient(client: BrokerClient | null) {
    if (!client) {
      setSelectedClient(null)
      return
    }

    setSelectedClient(client)
    setName(client.name)
    setPhone(client.phone)
    setEmail(client.email ?? '')
    setListDismissed(true)
  }

  function handlePhoneChange(value: string) {
    setPhone(value)
    setSelectedClient((current) => (current && current.phone === value ? current : null))
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    setSelectedClient((current) => (current && (current.email ?? '') === value.trim() ? current : null))
  }

  async function handleConfirm() {
    if (!unit || !reservationId || !canConfirm) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const clientId =
        selectedClient && sameClient(selectedClient, query, phone, trimmedEmail)
          ? selectedClient.id
          : (
              await brokerApi.createClient({
                name: query,
                phone,
                email: trimmedEmail || undefined,
              })
            ).id

      await brokerApi.attachPreHoldClient(reservationId, clientId, observations.trim() || undefined)
      resetState()
      onOpenChange(false)
      onReserved()
    } catch {
      setError('Não foi possível confirmar a pré-reserva. Verifique se ela ainda está válida.')
    } finally {
      setSubmitting(false)
    }
  }

  const nameHint = usingExistingClient
    ? 'Cliente já cadastrado. Telefone e e-mail foram preenchidos.'
    : noClientFound
      ? 'Nenhum cliente encontrado. Este nome será cadastrado ao confirmar a pré-reserva.'
      : query.length < CLIENT_SEARCH_MIN_LENGTH
        ? 'Digite ao menos 3 letras para buscar um cliente já cadastrado.'
        : null

  return (
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
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleConfirm()
          }}
        >
          <DialogHeader>
            <DialogTitle>Pré-reserva</DialogTitle>
            <DialogDescription>
              {unit
                ? `Unidade ${unit.code} · ${unitStatusLabels[unit.status as keyof typeof unitStatusLabels] ?? unit.status}`
                : 'Informe o cliente para confirmar a pré-reserva.'}
            </DialogDescription>
          </DialogHeader>

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

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="pre-hold-client-name">Nome *</FieldLabel>
              <Combobox
                items={suggestions}
                filter={null}
                value={selectedClient}
                onValueChange={handleSelectClient}
                inputValue={name}
                onInputValueChange={handleNameChange}
                itemToStringLabel={(client) => client.name}
                isItemEqualToValue={(item, value) => item.id === value.id}
                open={listOpen}
                onOpenChange={(nextOpen) => setListDismissed(!nextOpen)}
                autoHighlight
                disabled={expired}
              >
                <ComboboxInput
                  id="pre-hold-client-name"
                  className="w-full"
                  placeholder="Nome do cliente"
                  disabled={expired}
                  showTrigger={!searching && suggestions.length > 0}
                  autoComplete="off"
                >
                  {searching ? (
                    <InputGroupAddon align="inline-end">
                      <Spinner aria-label="Buscando clientes" />
                    </InputGroupAddon>
                  ) : null}
                </ComboboxInput>
                <ComboboxContent>
                  <ComboboxEmpty>Nenhum cliente encontrado.</ComboboxEmpty>
                  <ComboboxList>
                    {(client: BrokerClient) => (
                      <ComboboxItem key={client.id} value={client}>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{client.name}</span>
                          <span className="truncate text-muted-foreground">
                            {client.phone}
                            {client.email ? ` · ${client.email}` : ''}
                          </span>
                        </span>
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {nameHint ? <FieldDescription>{nameHint}</FieldDescription> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="pre-hold-client-phone">Telefone *</FieldLabel>
              <WhatsAppPhoneInput
                id="pre-hold-client-phone"
                value={phone}
                onChange={handlePhoneChange}
                required
                disabled={expired}
              />
            </Field>

            <Field data-invalid={emailInvalid || undefined}>
              <FieldLabel htmlFor="pre-hold-client-email">E-mail</FieldLabel>
              <Input
                id="pre-hold-client-email"
                type="email"
                value={email}
                onChange={(event) => handleEmailChange(event.target.value)}
                disabled={expired}
                aria-invalid={emailInvalid || undefined}
                autoComplete="off"
              />
              {emailInvalid ? <FieldError>Informe um e-mail válido.</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="pre-hold-observations">Proposta de entrada</FieldLabel>
              <Textarea
                id="pre-hold-observations"
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                placeholder="Ex.: R$ 80.000 em dinheiro e um terreno de 300 m²"
                disabled={expired}
              />
              <FieldDescription>
                Valor em dinheiro, terreno ou outra forma de entrada. A construtora recebe esse texto
                junto com a pré-reserva.
              </FieldDescription>
            </Field>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </FieldGroup>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={!canConfirm}>
              {submitting ? 'Confirmando...' : 'Confirmar pré-reserva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
