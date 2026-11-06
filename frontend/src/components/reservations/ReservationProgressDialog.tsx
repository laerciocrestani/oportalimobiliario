import { useEffect, useState } from 'react'
import { FileTextIcon } from 'lucide-react'
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
import { ContractReviewDialog } from '@/components/reservations/ContractReviewDialog'
import { ReservationChatPanel } from '@/components/reservations/ReservationChatPanel'
import {
  useReservationFileItems,
  type ReservationFileItem,
} from '@/components/reservations/ReservationAttachmentField'
import { ReservationFilesPanel } from '@/components/reservations/ReservationFilesPanel'
import { ReservationSubjectCard } from '@/components/reservations/ReservationSubjectCard'
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
import { formatListedPrice } from '@/lib/unit-listing'
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
  const [reviewContractOpen, setReviewContractOpen] = useState(false)
  const [govSignatureOpen, setGovSignatureOpen] = useState(false)
  const [signedContractOpen, setSignedContractOpen] = useState(false)
  const [builderSignedContractOpen, setBuilderSignedContractOpen] = useState(false)
  const [witnessSignOpen, setWitnessSignOpen] = useState(false)
  const [markSoldOpen, setMarkSoldOpen] = useState(false)
  const [extendHoldOpen, setExtendHoldOpen] = useState(false)
  const [dropHoldOpen, setDropHoldOpen] = useState(false)
  const [returnSignedProposalOpen, setReturnSignedProposalOpen] = useState(false)
  const { files: documentFiles, setFiles: setDocumentFiles } = useReservationFileItems()
  const [uploadError, setUploadError] = useState<string | null>(null)

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
        if (!cancelled) {
          onTimelineRefresh?.()
        }
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

    if (action === 'issue_contract' || action === 'review_contract') {
      setReviewContractOpen(true)
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

  async function handleDocumentFiles(next: ReservationFileItem[]) {
    const previous = new Set(documentFiles.map((item) => item.id))
    const added = next.filter((item) => !previous.has(item.id))

    setDocumentFiles(next)

    if (added.length === 0 || reservationId === null || profile !== 'broker') {
      return
    }

    setUploadError(null)

    try {
      await brokerApi.uploadReservationDocuments(reservationId, added.map((item) => item.file))
      setDocumentFiles((current) => current.filter((item) => !added.some((file) => file.id === item.id)))
      await loadTimeline()
    } catch {
      setUploadError('Não foi possível enviar os arquivos.')
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
  const unitAmount = listedAmount(timeline?.unit.price)
  const garageLines = (timeline?.garage_units ?? []).map((spot) => {
    const amount = listedAmount(spot.price)

    return {
      id: spot.id,
      code: spot.code,
      amount,
      original: amount,
    }
  })
  const garageTotal = garageLines.reduce((sum, spot) => sum + (spot.amount ?? 0), 0)
  const proposalTotal = unitAmount == null
    ? null
    : formatListedPrice(String(Math.round((unitAmount + garageTotal) * 100) / 100))

  const canDecideProposal =
    profile === 'builder' &&
    column === 'proposal_review' &&
    timeline?.current_stage === 'proposal_pending' &&
    timeline.current_proposal?.decision === null

  const proposalUnit: Unit | null = timeline?.unit
    ? {
        id: timeline.unit.id,
        code: timeline.unit.code,
        floor: null,
        area_m2: null,
        price: timeline.unit.price ?? null,
        status: timeline.unit.status,
        building: timeline.unit.building_name
          ? {
              id: 0,
              slug: '',
              name: timeline.unit.building_name,
              description: null,
              city: null,
              state: null,
              published: false,
              seo_title: null,
              seo_description: null,
            }
          : undefined,
      }
    : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[min(90vh,48rem)] max-w-6xl sm:max-w-6xl flex-col gap-0 overflow-hidden p-0">
          <div className="flex min-h-0 flex-1 flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 gap-4 border-b px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <FileTextIcon className="size-5" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <DialogTitle>Andamento da reserva</DialogTitle>
                <DialogDescription>
                  {column ? kanbanColumnLabel(column) : 'Acompanhe o que falta nesta etapa.'}
                </DialogDescription>
              </div>
            </div>
            {timeline ? (
              <ReservationSubjectCard
                buildingName={timeline.unit.building_name?.trim() ?? ''}
                unitCode={timeline.unit.code}
                unitAmount={unitAmount}
                unitOriginal={unitAmount}
                proposalTotal={proposalTotal}
                garageLines={garageLines}
              />
            ) : null}
          </DialogHeader>

          <DialogBody className="mx-0 min-h-0 flex-1 flex-col gap-0 overflow-hidden px-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Carregando andamento...</p>
            ) : error ? (
              <p className="p-6 text-sm text-destructive">{error}</p>
            ) : timeline && column ? (
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
                  {column === 'proposal_review' && isReturnedOrRejectedProposal(timeline.current_proposal) ? (
                    <ProposalDecisionAlert proposal={timeline.current_proposal} showProposal={false} />
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

                  <ReservationTimeline
                    className="shrink-0"
                    timeline={timeline}
                    onAction={handleAction}
                    signatureResend={
                      timeline.current_stage === 'proposal_signing' || timeline.current_stage === 'contract_signing'
                        ? {
                            profile,
                            reservationId: timeline.reservation_id,
                            document: timeline.current_stage === 'contract_signing' ? 'contract' : 'proposal',
                          }
                        : undefined
                    }
                  />
                </div>
            ) : null}
          </DialogBody>
          </div>
          {timeline ? (
            <div className="flex h-full min-h-0 w-[40%] shrink-0 flex-col border-l">
              <ReservationFilesPanel
                className="h-[60%] flex-none"
                attachments={timeline.attachments}
                files={profile === 'broker' ? documentFiles : undefined}
                onFilesChange={
                  profile === 'broker' && timeline.current_stage !== 'cancelled'
                    ? (next) => void handleDocumentFiles(next)
                    : undefined
                }
                uploadDisabled={timeline.current_stage === 'cancelled'}
                uploadError={uploadError}
              />
              <ReservationChatPanel
                className="h-[40%] flex-none border-t bg-background"
                profile={profile}
                reservationId={reservationId}
                active={open}
                onMessageSent={() => void handleRefresh()}
                readOnly={timeline.current_stage === 'cancelled'}
                composerId="reservation-progress-message"
                showHeading
              />
            </div>
          ) : null}
          </div>
          {canDecideProposal && timeline ? (
            <BuilderProposalDecisionPanel
              reservationId={timeline.reservation_id}
              onDecided={() => void handleRefresh()}
            />
          ) : null}
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
          <ContractReviewDialog
            open={reviewContractOpen}
            onOpenChange={setReviewContractOpen}
            reservationId={reservationId}
            onAccepted={() => void handleRefresh()}
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

function listedAmount(value: string | null | undefined): number | null {
  if (value == null || value === '') {
    return null
  }

  const amount = Number(value)

  return Number.isFinite(amount) ? amount : null
}
