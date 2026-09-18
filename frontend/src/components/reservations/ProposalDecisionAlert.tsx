import { CircleAlertIcon, MessageSquareIcon } from 'lucide-react'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ReservationAttachmentPreview } from '@/components/reservations/ReservationAttachmentPreview'
import type { ReservationProposal } from '@/lib/api'

type ProposalDecisionAlertProps = {
  proposal: ReservationProposal
  onOpenDialogue?: () => void
  showProposal?: boolean
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

export function isReturnedOrRejectedProposal(
  proposal: ReservationProposal | null | undefined,
): proposal is ReservationProposal & { decision: 'rejected' | 'returned' } {
  return proposal?.decision === 'rejected' || proposal?.decision === 'returned'
}

export function ProposalDecisionAlert({
  proposal,
  onOpenDialogue,
  showProposal = true,
}: ProposalDecisionAlertProps) {
  if (!isReturnedOrRejectedProposal(proposal)) {
    return null
  }

  const returned = proposal.decision === 'returned'
  const title = returned ? 'Proposta devolvida' : 'Proposta recusada'
  const note = proposal.decision_note?.trim() ?? ''

  return (
    <div className="flex flex-col gap-3">
      {showProposal ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Proposta v{proposal.version}</p>
          <p className="text-sm text-muted-foreground">
            {proposal.client_name}
            {hasText(proposal.client_phone) ? ` · ${proposal.client_phone}` : ''}
          </p>
          <p className="whitespace-pre-wrap text-sm">{proposal.payment_terms}</p>
          {proposal.attachments?.length ? (
            <div className="mt-2 flex flex-col gap-2">
              {proposal.attachments.map((attachment) => (
                <ReservationAttachmentPreview key={attachment.id} attachment={attachment} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <Alert variant={returned ? 'default' : 'destructive'}>
        <CircleAlertIcon />
        <AlertTitle>{title}</AlertTitle>
        {note ? (
          <AlertDescription className="whitespace-pre-wrap">{note}</AlertDescription>
        ) : null}
        {onOpenDialogue ? (
          <AlertAction>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onOpenDialogue}
              aria-label="Abrir diálogo"
            >
              <MessageSquareIcon />
            </Button>
          </AlertAction>
        ) : null}
      </Alert>
    </div>
  )
}
