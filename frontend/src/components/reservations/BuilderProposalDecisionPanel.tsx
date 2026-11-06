import { useState } from 'react'
import { CheckIcon, XIcon } from 'lucide-react'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { builderApi, type ProposalDecision } from '@/lib/api'

type BuilderProposalDecisionPanelProps = {
  reservationId: number
  onDecided: () => void
}

export function BuilderProposalDecisionPanel({
  reservationId,
  onDecided,
}: BuilderProposalDecisionPanelProps) {
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [acceptNote, setAcceptNote] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [submitting, setSubmitting] = useState<ProposalDecision | null>(null)
  const [error, setError] = useState<string | null>(null)

  function openAccept() {
    setError(null)
    setAcceptNote('')
    setAcceptOpen(true)
  }

  function openReject() {
    setError(null)
    setRejectNote('')
    setRejectOpen(true)
  }

  async function handleDecision(decision: ProposalDecision, note: string) {
    if (decision === 'rejected' && note.trim() === '') {
      setError('Informe o motivo para recusar a proposta.')
      return
    }

    setSubmitting(decision)
    setError(null)

    try {
      await builderApi.decideReservationProposal(reservationId, decision, note)
      setAcceptOpen(false)
      setRejectOpen(false)
      onDecided()
    } catch {
      setError('Não foi possível registrar a decisão da proposta.')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <>
      <DialogFooter className="mx-0 mb-0">
        <Button
          type="button"
          variant="outline"
          disabled={submitting !== null}
          onClick={openReject}
        >
          <XIcon data-icon="inline-start" />
          Recusar
        </Button>
        <Button
          type="button"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={submitting !== null}
          onClick={openAccept}
        >
          <CheckIcon data-icon="inline-start" />
          Aceitar
        </Button>
      </DialogFooter>

      <Dialog
        open={acceptOpen}
        onOpenChange={(nextOpen) => {
          if (submitting !== null) {
            return
          }
          setAcceptOpen(nextOpen)
          if (!nextOpen) {
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aceitar proposta</DialogTitle>
            <DialogDescription>
              Ao aceitar, a proposta segue para assinatura do cliente, do signatário da construtora e do corretor.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="pb-3">
            <Field>
              <FieldLabel htmlFor="accept-decision-note">Observação da decisão</FieldLabel>
              <Textarea
                id="accept-decision-note"
                className="min-h-28"
                value={acceptNote}
                onChange={(event) => setAcceptNote(event.target.value)}
                placeholder="Opcional."
              />
            </Field>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={submitting !== null}
              onClick={() => void handleDecision('accepted', acceptNote)}
            >
              <CheckIcon data-icon="inline-start" />
              {submitting === 'accepted' ? 'Processando...' : 'Aceitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectOpen}
        onOpenChange={(nextOpen) => {
          if (submitting !== null) {
            return
          }
          setRejectOpen(nextOpen)
          if (!nextOpen) {
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar proposta</DialogTitle>
            <DialogDescription>Informe o motivo da recusa.</DialogDescription>
          </DialogHeader>
          <DialogBody className="pb-3">
            <Field>
              <FieldLabel htmlFor="reject-decision-note">Observação da decisão</FieldLabel>
              <Textarea
                id="reject-decision-note"
                className="min-h-28"
                value={rejectNote}
                onChange={(event) => setRejectNote(event.target.value)}
                placeholder="Obrigatório para recusar."
              />
            </Field>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting !== null || rejectNote.trim() === ''}
              onClick={() => void handleDecision('rejected', rejectNote)}
            >
              <XIcon data-icon="inline-start" />
              {submitting === 'rejected' ? 'Processando...' : 'Recusar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
