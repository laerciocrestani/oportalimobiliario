import { unitStatusLabels } from '@/apps/builder/lib/unit-status'
import { BrokerReservationDialog } from '@/apps/broker/components/BrokerReservationDialog'
import { ReservationMessagesDialog } from '@/apps/builder/components/ReservationMessagesDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { BuildingWithUnits } from '@/apps/broker/lib/group-units-by-building'
import { brokerApi, ApiRequestError, type Unit } from '@/lib/api'
import {
  buildStatusSnapshot,
  detectPreHoldTransitionToast,
  PRE_RESERVE_POLL_MS,
} from '@/lib/reservation-polling'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

type BrokerUnitsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  building: BuildingWithUnits | null
  onReserved: () => void
}

function UnitRowActions({
  unit,
  holdingUnitId,
  onPreReserve,
  onContinueReservation,
  onCancelReservation,
  onOpenMessages,
  cancelling,
}: {
  unit: Unit
  holdingUnitId: number | null
  onPreReserve: (unit: Unit) => void
  onContinueReservation: (unit: Unit) => void
  onCancelReservation: (unit: Unit) => void
  onOpenMessages: (unit: Unit) => void
  cancelling: boolean
}) {
  const clientName = unit.reservation?.client?.name

  if (clientName) {
    return (
      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">Reservado para {clientName}</p>
        <Button size="sm" variant="secondary" onClick={() => onOpenMessages(unit)}>
          Ver conversa
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={cancelling}
          onClick={() => onCancelReservation(unit)}
        >
          {cancelling ? 'Removendo...' : 'Remover reserva'}
        </Button>
      </div>
    )
  }

  if (unit.status === 'pre_reserved') {
    if (unit.pre_hold?.held_by_me || unit.reservation) {
      return (
        <Button
          size="sm"
          disabled={holdingUnitId === unit.id}
          onClick={() => onContinueReservation(unit)}
        >
          {holdingUnitId === unit.id ? 'Pré-reservando...' : 'Continuar reserva'}
        </Button>
      )
    }

    return <p className="text-sm text-muted-foreground">Pré-reservada</p>
  }

  if (unit.status === 'available') {
    return (
      <Button
        size="sm"
        disabled={holdingUnitId === unit.id}
        onClick={() => onPreReserve(unit)}
      >
        {holdingUnitId === unit.id ? 'Pré-reservando...' : 'Pré-reservar'}
      </Button>
    )
  }

  return null
}

export function BrokerUnitsDialog({
  open,
  onOpenChange,
  building,
  onReserved,
}: BrokerUnitsDialogProps) {
  const [units, setUnits] = useState<Unit[]>(building?.units ?? [])
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [preHoldReservationId, setPreHoldReservationId] = useState<number | null>(null)
  const [preHoldExpiresAt, setPreHoldExpiresAt] = useState<string | null>(null)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [messagesReservationId, setMessagesReservationId] = useState<number | null>(null)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [cancellingUnitId, setCancellingUnitId] = useState<number | null>(null)
  const [holdingUnitId, setHoldingUnitId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previousStatusRef = useRef(buildStatusSnapshot(building?.units ?? []))
  const toastShownForRef = useRef(new Set<number>())
  const pollingPausedRef = useRef(false)

  useEffect(() => {
    if (!open || !building) {
      return
    }

    setUnits(building.units)
    previousStatusRef.current = buildStatusSnapshot(building.units)
    toastShownForRef.current.clear()
  }, [building, open])

  useEffect(() => {
    if (!open || !building || reservationOpen) {
      return
    }

    let cancelled = false

    async function pollUnits() {
      if (pollingPausedRef.current || cancelled) {
        return
      }

      try {
        const allUnits = await brokerApi.listUnits()
        const nextUnits = allUnits.filter((unit) => unit.building?.id === building.id)

        const toastTarget = detectPreHoldTransitionToast(
          previousStatusRef.current,
          nextUnits,
          toastShownForRef.current,
        )

        if (toastTarget) {
          toastShownForRef.current.add(toastTarget.unitId)
          toast.message(
            `Unidade ${toastTarget.unitCode} acaba de ser pré-reservada por outro corretor.`,
          )
        }

        previousStatusRef.current = buildStatusSnapshot(nextUnits)
        setUnits(nextUnits)
      } catch {
        // Polling silencioso — não interrompe o fluxo do corretor.
      }
    }

    void pollUnits()
    const intervalId = window.setInterval(() => void pollUnits(), PRE_RESERVE_POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [building, open, reservationOpen])

  function openReservationDialog(unit: Unit, reservationId: number, expiresAt: string) {
    setSelectedUnit(unit)
    setPreHoldReservationId(reservationId)
    setPreHoldExpiresAt(expiresAt)
    setReservationOpen(true)
  }

  async function handlePreReserveClick(unit: Unit) {
    setError(null)
    setHoldingUnitId(unit.id)

    try {
      const reservation = await brokerApi.createPreHold(unit.id)
      openReservationDialog(unit, reservation.id, reservation.expires_at)
    } catch (err) {
      const message =
        err instanceof ApiRequestError && err.status === 422
          ? err.message
          : 'Não foi possível pré-reservar a unidade.'

      toast.error(message)
      setError(message)
    } finally {
      setHoldingUnitId(null)
    }
  }

  function handleContinueReservation(unit: Unit) {
    const reservationId = unit.reservation?.id ?? unit.pre_hold?.reservation_id
    const expiresAt = unit.reservation?.expires_at ?? unit.pre_hold?.expires_at

    if (!reservationId || !expiresAt) {
      return
    }

    openReservationDialog(unit, reservationId, expiresAt)
  }

  function handleOpenMessages(unit: Unit) {
    const reservationId = unit.reservation?.id
    if (!reservationId) {
      return
    }

    setMessagesReservationId(reservationId)
    setMessagesOpen(true)
  }

  async function handleCancelReservation(unit: Unit) {
    const reservationId = unit.reservation?.id
    if (!reservationId) {
      return
    }

    try {
      setError(null)
      setCancellingUnitId(unit.id)
      await brokerApi.cancelReservation(reservationId)
      onReserved()
    } catch {
      setError('Não foi possível remover a reserva.')
    } finally {
      setCancellingUnitId(null)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedUnit(null)
            setPreHoldReservationId(null)
            setPreHoldExpiresAt(null)
            setReservationOpen(false)
            setError(null)
          }
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{building?.name ?? 'Unidades'}</DialogTitle>
            <DialogDescription>
              Selecione uma unidade disponível para iniciar a pré-reserva.
            </DialogDescription>
          </DialogHeader>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <ul className="divide-y rounded-lg border">
            {units.map((unit) => (
              <li key={unit.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium">{unit.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {unitStatusLabels[unit.status as keyof typeof unitStatusLabels] ?? unit.status}
                    {unit.price ? ` · R$ ${unit.price}` : ''}
                  </p>
                </div>
                <UnitRowActions
                  unit={unit}
                  holdingUnitId={holdingUnitId}
                  onPreReserve={(target) => void handlePreReserveClick(target)}
                  onContinueReservation={handleContinueReservation}
                  onCancelReservation={(target) => void handleCancelReservation(target)}
                  onOpenMessages={handleOpenMessages}
                  cancelling={cancellingUnitId === unit.id}
                />
              </li>
            ))}
            {units.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhuma unidade liberada neste empreendimento.
              </li>
            ) : null}
          </ul>
        </DialogContent>
      </Dialog>

      <BrokerReservationDialog
        open={reservationOpen}
        onOpenChange={(nextOpen) => {
          pollingPausedRef.current = nextOpen
          setReservationOpen(nextOpen)
          if (!nextOpen) {
            setPreHoldReservationId(null)
            setPreHoldExpiresAt(null)
          }
        }}
        unit={selectedUnit}
        reservationId={preHoldReservationId}
        expiresAt={preHoldExpiresAt}
        onReserved={() => {
          setReservationOpen(false)
          onOpenChange(false)
          onReserved()
        }}
      />

      <ReservationMessagesDialog
        profile="broker"
        reservationId={messagesReservationId}
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
      />
    </>
  )
}
