import { useEffect, useState } from 'react'
import { BrokerReservationDialog } from '@/apps/broker/components/BrokerReservationDialog'
import { BrokerContractDataDialog } from '@/components/reservations/BrokerContractDataDialog'
import { BrokerDepositProofDialog } from '@/components/reservations/BrokerDepositProofDialog'
import { BrokerGovSignatureDialog } from '@/components/reservations/BrokerGovSignatureDialog'
import { BrokerSignedContractDialog } from '@/components/reservations/BrokerSignedContractDialog'
import { BuilderContractValidatePanel } from '@/components/reservations/BuilderContractValidatePanel'
import { BuilderDropHoldDialog } from '@/components/reservations/BuilderDropHoldDialog'
import { BuilderExtendHoldDialog } from '@/components/reservations/BuilderExtendHoldDialog'
import { BuilderMarkSoldDialog } from '@/components/reservations/BuilderMarkSoldDialog'
import { BuilderSignedContractDialog } from '@/components/reservations/BuilderSignedContractDialog'
import { BuilderWitnessSignDialog } from '@/components/reservations/BuilderWitnessSignDialog'
import { BuilderDepositProofApprovalPanel } from '@/components/reservations/BuilderDepositProofApprovalPanel'
import { BuilderProposalDecisionPanel } from '@/components/reservations/BuilderProposalDecisionPanel'
import { BrokerReturnSignedProposalDialog } from '@/components/reservations/BrokerReturnSignedProposalDialog'
import { BuilderIssueContractDialog } from '@/components/reservations/BuilderIssueContractDialog'
import { ReservationChatPanel } from '@/components/reservations/ReservationChatPanel'
import {
  isReturnedOrRejectedProposal,
  ProposalDecisionAlert,
} from '@/components/reservations/ProposalDecisionAlert'
import { ReservationTimeline } from '@/components/reservations/ReservationTimeline'
import {
  kanbanColumnLabel,
  timelineKanbanColumn,
} from '@/components/reservations/reservation-kanban'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { builderApi, brokerApi, type ReservationTimeline as ReservationTimelineData, type Unit } from '@/lib/api'
import { notifyReservationBadgeRefresh } from '@/lib/reservation-badge-events'

type ReservationProgressDialogProps = {
  profile: 'broker' | 'builder'
  reservationId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTimelineRefresh?: () => void
}

export function ReservationProgressDialog({
  profile,
  reservationId,
  open,
  onOpenChange,
  onTimelineRefresh,
}: ReservationProgressDialogProps) {
  const [timeline, setTimeline] = useState<ReservationTimelineData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [depositProofOpen, setDepositProofOpen] = useState(false)
  const [contractDataOpen, setContractDataOpen] = useState(false)
  const [issueContractOpen, setIssueContractOpen] = useState(false)
  const [govSignatureOpen, setGovSignatureOpen] = useState(false)
  const [signedContractOpen, setSignedContractOpen] = useState(false)
  const [builderSignedContractOpen, setBuilderSignedContractOpen] = useState(false)
  const [witnessSignOpen, setWitnessSignOpen] = useState(false)
  const [markSoldOpen, setMarkSoldOpen] = useState(false)
  const [extendHoldOpen, setExtendHoldOpen] = useState(false)
  const [dropHoldOpen, setDropHoldOpen] = useState(false)
  const [returnSignedProposalOpen, setReturnSignedProposalOpen] = useState(false)

  async function loadTimeline() {
    if (reservationId === null) {
      return
    }

    const api = profile === 'builder' ? builderApi : brokerApi
    const data = await api.getReservationTimeline(reservationId)
    setTimeline(data)
  }

  useEffect(() => {
    if (!open || reservationId === null) {
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        setTimeline(null)
        await loadTimeline()
      } catch {
        if (!cancelled) {
          setError('Não foi possível carregar o andamento da reserva.')
          setTimeline(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, profile, reservationId])

  function handleAction(action: string) {
    if (action === 'submit_proposal') {
      setProposalOpen(true)
      return
    }

    if (action === 'submit_deposit_proof') {
      setDepositProofOpen(true)
      return
    }

    if (action === 'return_signed_proposal') {
      setReturnSignedProposalOpen(true)
      return
    }

    if (action === 'submit_contract_data') {
      setContractDataOpen(true)
      return
    }

    if (action === 'issue_contract') {
      setIssueContractOpen(true)
      return
    }

    if (action === 'mark_signed_gov') {
      setGovSignatureOpen(true)
      return
    }

    if (action === 'upload_signed_contract') {
      setSignedContractOpen(true)
      return
    }

    if (action === 'upload_builder_signed_contract') {
      setBuilderSignedContractOpen(true)
      return
    }

    if (action === 'sign_as_witness') {
      setWitnessSignOpen(true)
      return
    }

    if (action === 'validate_contract') {
      setMarkSoldOpen(true)
      return
    }

    if (action === 'extend_hold') {
      setExtendHoldOpen(true)
      return
    }

    if (action === 'drop_hold') {
      setDropHoldOpen(true)
    }
  }

  async function handleRefresh() {
    onTimelineRefresh?.()
    notifyReservationBadgeRefresh()

    try {
      await loadTimeline()
    } catch {
      setError('Não foi possível atualizar o andamento da reserva.')
    }
  }

  const column = timeline ? timelineKanbanColumn(timeline) : null
  const currentStep = timeline?.steps.find((step) => step.status === 'current')
  const currentWitnessSlot = currentStep?.key === 'contract_witness_2' ? 2 : 1

  const proposalUnit: Unit | null = timeline?.unit
    ? {
        id: timeline.unit.id,
        code: timeline.unit.code,
        floor: null,
        area_m2: null,
        price: null,
        status: timeline.unit.status,
      }
    : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[min(90vh,48rem)] max-w-6xl sm:max-w-6xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
            <DialogTitle>Andamento da reserva</DialogTitle>
            <DialogDescription>
              {column ? kanbanColumnLabel(column) : 'Acompanhe o que falta nesta etapa.'}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="mx-0 min-h-0 flex-1 flex-row gap-0 overflow-hidden px-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Carregando andamento...</p>
            ) : error ? (
              <p className="p-6 text-sm text-destructive">{error}</p>
            ) : timeline && column ? (
              <>
                <div className="flex min-h-0 w-[60%] flex-col gap-4 overflow-hidden p-6">
                  {column === 'proposal_review' &&
                  profile === 'builder' &&
                  timeline.current_proposal &&
                  timeline.current_stage === 'proposal_pending' &&
                  timeline.current_proposal.decision === null ? (
                    <BuilderProposalDecisionPanel
                      reservationId={timeline.reservation_id}
                      proposal={timeline.current_proposal}
                      attachments={timeline.attachments}
                      onDecided={() => void handleRefresh()}
                    />
                  ) : null}

                  {column === 'proposal_review' && isReturnedOrRejectedProposal(timeline.current_proposal) ? (
                    <div className="rounded-lg border p-4">
                      <ProposalDecisionAlert proposal={timeline.current_proposal} />
                    </div>
                  ) : null}

                  {column === 'docs_deposit' &&
                  profile === 'builder' &&
                  timeline.current_deposit_proof &&
                  timeline.current_stage === 'deposit_proof_pending' ? (
                    <BuilderDepositProofApprovalPanel
                      reservationId={timeline.reservation_id}
                      attachment={timeline.current_deposit_proof}
                      onApproved={() => void handleRefresh()}
                    />
                  ) : null}

                  {column === 'contract' &&
                  profile === 'builder' &&
                  timeline.current_signed_contract &&
                  timeline.current_stage === 'contract_uploaded' ? (
                    <BuilderContractValidatePanel
                      title="Contrato assinado pelo comprador"
                      description="Baixe o PDF, assine pela construtora e envie o arquivo assinado."
                      attachment={timeline.current_signed_contract}
                      actionLabel="Enviar contrato assinado pela construtora"
                      onAction={() => setBuilderSignedContractOpen(true)}
                    />
                  ) : null}

                  {column === 'contract' &&
                  profile === 'builder' &&
                  timeline.current_builder_signed_contract &&
                  currentStep?.actions.includes('validate_contract') ? (
                    <BuilderContractValidatePanel
                      title="Contrato assinado pela construtora"
                      description="Confira o PDF e as assinaturas das testemunhas e confirme a venda da unidade."
                      attachment={timeline.current_builder_signed_contract}
                      actionLabel="Unidade vendida"
                      onAction={() => setMarkSoldOpen(true)}
                    />
                  ) : null}

                  {column === 'contract' &&
                  profile === 'builder' &&
                  currentStep?.actions.includes('sign_as_witness') &&
                  timeline.current_builder_signed_contract ? (
                    <BuilderContractValidatePanel
                      title={`Assinatura da testemunha ${currentWitnessSlot}`}
                      description="Registre no sistema que você testemunhou este contrato."
                      attachment={timeline.current_builder_signed_contract}
                      actionLabel="Registrar assinatura"
                      onAction={() => setWitnessSignOpen(true)}
                    />
                  ) : null}

                  <ReservationTimeline className="min-h-0 flex-1" timeline={timeline} onAction={handleAction} />
                </div>

                <div className="flex min-h-0 w-[40%] flex-col border-l bg-muted/20">
                  <ReservationChatPanel
                    profile={profile}
                    reservationId={reservationId}
                    active={open}
                    onMessageSent={() => void handleRefresh()}
                    readOnly={timeline.current_stage === 'cancelled'}
                    composerId="reservation-progress-message"
                    showHeading
                  />
                </div>
              </>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {profile === 'broker' && reservationId !== null ? (
        <>
          <BrokerReservationDialog
            open={proposalOpen}
            onOpenChange={setProposalOpen}
            unit={proposalUnit}
            reservationId={reservationId}
            expiresAt={timeline?.current_stage === 'pre_hold' ? (timeline.expires_at ?? null) : null}
            releaseHoldOnClose={false}
            client={timeline?.client ?? null}
            proposal={timeline?.current_proposal ?? null}
            onReserved={() => void handleRefresh()}
          />
          <BrokerDepositProofDialog
            open={depositProofOpen}
            onOpenChange={setDepositProofOpen}
            reservationId={reservationId}
            onSubmitted={() => void handleRefresh()}
          />
          <BrokerReturnSignedProposalDialog
            open={returnSignedProposalOpen}
            onOpenChange={setReturnSignedProposalOpen}
            reservationId={reservationId}
            onSubmitted={() => void handleRefresh()}
          />
          <BrokerContractDataDialog
            open={contractDataOpen}
            onOpenChange={setContractDataOpen}
            reservationId={reservationId}
            client={timeline?.client ?? null}
            proposal={timeline?.current_proposal ?? null}
            onSubmitted={() => void handleRefresh()}
          />
          <BrokerGovSignatureDialog
            open={govSignatureOpen}
            onOpenChange={setGovSignatureOpen}
            reservationId={reservationId}
            onSubmitted={() => void handleRefresh()}
          />
          <BrokerSignedContractDialog
            open={signedContractOpen}
            onOpenChange={setSignedContractOpen}
            reservationId={reservationId}
            onSubmitted={() => void handleRefresh()}
          />
        </>
      ) : null}

      {profile === 'builder' && reservationId !== null ? (
        <>
          <BuilderIssueContractDialog
            open={issueContractOpen}
            onOpenChange={setIssueContractOpen}
            reservationId={reservationId}
            onIssued={() => void handleRefresh()}
          />
          <BuilderSignedContractDialog
            open={builderSignedContractOpen}
            onOpenChange={setBuilderSignedContractOpen}
            reservationId={reservationId}
            onSubmitted={() => void handleRefresh()}
          />
          <BuilderWitnessSignDialog
            open={witnessSignOpen}
            onOpenChange={setWitnessSignOpen}
            reservationId={reservationId}
            slot={currentWitnessSlot}
            onSubmitted={() => void handleRefresh()}
          />
          <BuilderMarkSoldDialog
            open={markSoldOpen}
            onOpenChange={setMarkSoldOpen}
            reservationId={reservationId}
            onSubmitted={() => void handleRefresh()}
          />
          <BuilderExtendHoldDialog
            open={extendHoldOpen}
            onOpenChange={setExtendHoldOpen}
            reservationId={reservationId}
            onSubmitted={() => void handleRefresh()}
          />
          <BuilderDropHoldDialog
            open={dropHoldOpen}
            onOpenChange={setDropHoldOpen}
            reservationId={reservationId}
            onSubmitted={() => void handleRefresh()}
          />
        </>
      ) : null}
    </>
  )
}
