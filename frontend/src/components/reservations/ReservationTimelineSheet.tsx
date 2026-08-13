import { useEffect, useState } from 'react'
import { BrokerReservationDialog } from '@/apps/broker/components/BrokerReservationDialog'
import { BrokerDepositProofDialog } from '@/components/reservations/BrokerDepositProofDialog'
import { BuilderDepositProofApprovalPanel } from '@/components/reservations/BuilderDepositProofApprovalPanel'
import { BuilderProposalDecisionPanel } from '@/components/reservations/BuilderProposalDecisionPanel'
import { ReservationMessagesDialog } from '@/apps/builder/components/ReservationMessagesDialog'
import { ReservationTimeline } from '@/components/reservations/ReservationTimeline'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { builderApi, brokerApi, type ReservationTimeline as ReservationTimelineData, type Unit } from '@/lib/api'

type ReservationTimelineSheetProps = {
  profile: 'broker' | 'builder'
  reservationId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTimelineRefresh?: () => void
}

export function ReservationTimelineSheet({
  profile,
  reservationId,
  open,
  onOpenChange,
  onTimelineRefresh,
}: ReservationTimelineSheetProps) {
  const [timeline, setTimeline] = useState<ReservationTimelineData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [depositProofOpen, setDepositProofOpen] = useState(false)

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
    if (action === 'open_dialogue') {
      setMessagesOpen(true)
      return
    }

    if (action === 'submit_proposal') {
      setProposalOpen(true)
      return
    }

    if (action === 'submit_deposit_proof') {
      setDepositProofOpen(true)
    }
  }

  async function handleRefresh() {
    onTimelineRefresh?.()

    try {
      await loadTimeline()
    } catch {
      setError('Não foi possível atualizar o andamento da reserva.')
    }
  }

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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Andamento da reserva</SheetTitle>
            <SheetDescription>
              Acompanhe cada etapa do processo, da pré-reserva até a venda.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando andamento...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : timeline ? (
              <>
                {profile === 'builder' &&
                timeline.current_proposal &&
                timeline.current_stage === 'proposal_pending' &&
                timeline.current_proposal.decision === null ? (
                  <BuilderProposalDecisionPanel
                    reservationId={timeline.reservation_id}
                    proposal={timeline.current_proposal}
                    onDecided={() => void handleRefresh()}
                  />
                ) : null}

                {profile === 'builder' &&
                timeline.current_deposit_proof &&
                timeline.current_stage === 'deposit_proof_pending' ? (
                  <BuilderDepositProofApprovalPanel
                    reservationId={timeline.reservation_id}
                    attachment={timeline.current_deposit_proof}
                    onApproved={() => void handleRefresh()}
                  />
                ) : null}

                <ReservationTimeline timeline={timeline} onAction={handleAction} />
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <ReservationMessagesDialog
        profile={profile}
        reservationId={reservationId}
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
        onMessageSent={() => void handleRefresh()}
      />

      {profile === 'broker' && reservationId !== null ? (
        <>
          <BrokerReservationDialog
            open={proposalOpen}
            onOpenChange={setProposalOpen}
            unit={proposalUnit}
            reservationId={reservationId}
            expiresAt={timeline?.expires_at ?? null}
            onReserved={() => void handleRefresh()}
          />
          <BrokerDepositProofDialog
            open={depositProofOpen}
            onOpenChange={setDepositProofOpen}
            reservationId={reservationId}
            onSubmitted={() => void handleRefresh()}
          />
        </>
      ) : null}
    </>
  )
}
