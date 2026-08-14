import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { builderApi, type ProposalDecision, type ReservationProposal } from '@/lib/api'

type BuilderProposalDecisionPanelProps = {
  reservationId: number
  proposal: ReservationProposal
  onDecided: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function BuilderProposalDecisionPanel({
  reservationId,
  proposal,
  onDecided,
}: BuilderProposalDecisionPanelProps) {
  const [decisionNote, setDecisionNote] = useState('')
  const [submitting, setSubmitting] = useState<ProposalDecision | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDecision(decision: ProposalDecision) {
    setSubmitting(decision)
    setError(null)

    try {
      await builderApi.decideReservationProposal(reservationId, decision, decisionNote)
      onDecided()
    } catch {
      setError('Não foi possível registrar a decisão da proposta.')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Proposta v{proposal.version}</p>
        <p className="text-sm text-muted-foreground">{proposal.client_name} · {proposal.client_cpf}</p>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">E-mail</dt>
          <dd>{proposal.client_email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Telefone</dt>
          <dd>{proposal.client_phone}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Endereço</dt>
          <dd>
            {proposal.address}, {proposal.city}/{proposal.state} · {proposal.zip}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estado civil</dt>
          <dd>{proposal.marital_status}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Nacionalidade</dt>
          <dd>{proposal.nationality}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Valor do terreno</dt>
          <dd>{formatCurrency(proposal.land_value)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Condições de pagamento</dt>
          <dd>{proposal.payment_terms}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <Label htmlFor="decision-note">Observação da decisão</Label>
        <textarea
          id="decision-note"
          className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={decisionNote}
          onChange={(e) => setDecisionNote(e.target.value)}
          placeholder="Obrigatório para devolução ou recusa."
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={submitting !== null}
          onClick={() => void handleDecision('accepted')}
        >
          {submitting === 'accepted' ? 'Processando...' : 'Aceitar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submitting !== null}
          onClick={() => void handleDecision('returned')}
        >
          {submitting === 'returned' ? 'Processando...' : 'Devolver'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={submitting !== null}
          onClick={() => void handleDecision('rejected')}
        >
          {submitting === 'rejected' ? 'Processando...' : 'Recusar'}
        </Button>
      </div>
    </div>
  )
}
