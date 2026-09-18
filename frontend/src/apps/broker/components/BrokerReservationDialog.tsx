import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { ProposalDecisionAlert } from '@/components/reservations/ProposalDecisionAlert'
import {
  ReservationAttachmentField,
  useReservationFileItems,
} from '@/components/reservations/ReservationAttachmentField'
import { brokerApi, type BrokerClient, type ReservationProposal, type ReservationProposalInput, type ReservationTimelineClient, type Unit } from '@/lib/api'
import { formatBrazilianMobilePhone } from '@/lib/format-phone'

type BrokerReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit: Unit | null
  reservationId: number | null
  expiresAt: string | null
  onReserved: () => void
  releaseHoldOnClose?: boolean
  client?: BrokerClient | ReservationTimelineClient | null
  proposal?: ReservationProposal | null
  onOpenDialogue?: () => void
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
  proposal = null,
  onOpenDialogue,
}: BrokerReservationDialogProps) {
  const [paymentTerms, setPaymentTerms] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [remainingTime, setRemainingTime] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const { files, setFiles } = useReservationFileItems()

  const clientName = client?.name.trim() ?? ''
  const clientPhone = client?.phone ? formatBrazilianMobilePhone(client.phone) : ''

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
    setPaymentTerms('')
    setError(null)
    setExpired(false)
    setRemainingTime(null)
    setFiles([])
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
    if (!unit || !reservationId || expired || clientName === '' || clientPhone === '' || files.length === 0) {
      return
    }

    const payload: ReservationProposalInput = {
      client_name: clientName,
      client_phone: clientPhone,
      payment_terms: paymentTerms.trim(),
    }

    setSubmitting(true)
    setError(null)

    try {
      await brokerApi.submitReservationProposal(
        reservationId,
        payload,
        files.map((item) => item.file),
      )
      resetState()
      onOpenChange(false)
      onReserved()
    } catch {
      setError('Não foi possível enviar a proposta. Verifique se a pré-reserva ainda está válida.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = clientName !== '' && clientPhone !== '' && paymentTerms.trim() !== '' && files.length > 0

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
        <DialogHeader>
          <DialogTitle>Enviar proposta</DialogTitle>
          <DialogDescription>
            {unit
              ? `Unidade ${unit.code} — informe apenas a proposta comercial. Nome e telefone podem ser alterados na área de clientes ou em Dados para contrato.`
              : 'Informe apenas a proposta comercial. Nome e telefone podem ser alterados na área de clientes ou em Dados para contrato.'}
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
            {proposal && onOpenDialogue ? (
              <ProposalDecisionAlert
                proposal={proposal}
                onOpenDialogue={onOpenDialogue}
                showProposal={false}
              />
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Cliente</p>
                <p className="text-sm text-muted-foreground">{clientName || 'Cliente não informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Telefone</p>
                <p className="text-sm text-muted-foreground">{clientPhone || '—'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposal-terms">Proposta *</Label>
              <Textarea
                id="proposal-terms"
                className="min-h-28"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Ex: Entrada de R$ 50.000 + 24x de R$ 5.000"
                disabled={expired}
              />
            </div>

            <div className="space-y-2">
              <Label>Anexos *</Label>
              <ReservationAttachmentField
                files={files}
                onFilesChange={setFiles}
                multiple
                disabled={expired}
                emptyLabel="Anexar documentos da proposta"
              />
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP ou PDF, até 10MB cada. O gestor confere esses arquivos antes de decidir.
              </p>
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
  )
}
