import { unitStatusLabels } from '@/apps/builder/lib/unit-status'
import { BrokerPreHoldDialog } from '@/apps/broker/components/BrokerPreHoldDialog'
import { BrokerReservationDialog } from '@/apps/broker/components/BrokerReservationDialog'
import { ReservationMessagesDialog } from '@/apps/builder/components/ReservationMessagesDialog'
import { ReservationCancelDialog } from '@/components/reservations/ReservationCancelDialog'
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
import type { BuildingWithUnits } from '@/apps/broker/lib/group-units-by-building'
import { brokerApi, ApiRequestError, type Unit } from '@/lib/api'
import {
  formatAmenityNames,
  formatListedPrice,
  formatPriceCompetence,
  formatUnitSpecSummary,
} from '@/lib/unit-listing'
import {
  buildStatusSnapshot,
  detectPreHoldTransitionToast,
  PRE_RESERVE_POLL_MS,
} from '@/lib/reservation-polling'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

type BrokerUnitsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  building: BuildingWithUnits | null
  onReserved: () => void
}

function isGarageUnit(unit: Unit): boolean {
  return unit.floor_kind === 'garage'
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
  if (isGarageUnit(unit)) {
    return (
      <p className="text-sm text-muted-foreground">
        {unit.status === 'available' ? 'Vaga disponível' : unitStatusLabels[unit.status as keyof typeof unitStatusLabels] ?? unit.status}
      </p>
    )
  }

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
  const [preHoldFormOpen, setPreHoldFormOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [messagesReservationId, setMessagesReservationId] = useState<number | null>(null)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [cancellingUnitId, setCancellingUnitId] = useState<number | null>(null)
  const [cancelUnit, setCancelUnit] = useState<Unit | null>(null)
  const [holdingUnitId, setHoldingUnitId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [garagePickerUnit, setGaragePickerUnit] = useState<Unit | null>(null)
  const [selectedGarageIds, setSelectedGarageIds] = useState<number[]>([])

  const previousStatusRef = useRef(buildStatusSnapshot(building?.units ?? []))
  const toastShownForRef = useRef(new Set<number>())
  const pollingPausedRef = useRef(false)

  const availableGarages = useMemo(
    () => units.filter((unit) => isGarageUnit(unit) && unit.status === 'available'),
    [units],
  )

  const listedUnits = useMemo(() => {
    const primary = units.filter((unit) => !isGarageUnit(unit))
    const garages = units.filter((unit) => isGarageUnit(unit))

    return [...primary, ...garages]
  }, [units])

  useEffect(() => {
    if (!open || !building) {
      return
    }

    setUnits(building.units)
    previousStatusRef.current = buildStatusSnapshot(building.units)
    toastShownForRef.current.clear()
  }, [building, open])

  useEffect(() => {
    if (!open || !building || preHoldFormOpen || proposalOpen || cancelUnit !== null || garagePickerUnit !== null) {
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
  }, [building, open, preHoldFormOpen, proposalOpen, cancelUnit, garagePickerUnit])

  function openPreHoldForm(unit: Unit, reservationId: number, expiresAt: string | null) {
    setSelectedUnit(unit)
    setPreHoldReservationId(reservationId)
    setPreHoldExpiresAt(expiresAt)
    setPreHoldFormOpen(true)
  }

  function openProposalForm(unit: Unit, reservationId: number, expiresAt: string | null) {
    setSelectedUnit(unit)
    setPreHoldReservationId(reservationId)
    setPreHoldExpiresAt(expiresAt)
    setProposalOpen(true)
  }

  function handlePreReserveClick(unit: Unit) {
    if (isGarageUnit(unit)) {
      return
    }

    setError(null)

    if (availableGarages.length > 0) {
      setGaragePickerUnit(unit)
      setSelectedGarageIds([])
      return
    }

    void submitPreHold(unit, [])
  }

  async function submitPreHold(unit: Unit, garageUnitIds: number[]) {
    setHoldingUnitId(unit.id)
    setGaragePickerUnit(null)

    try {
      const reservation = await brokerApi.createPreHold(unit.id, garageUnitIds)
      openPreHoldForm(unit, reservation.id, reservation.expires_at)
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
    const expiresAt = unit.reservation?.expires_at ?? unit.pre_hold?.expires_at ?? null
    const reservationStatus = unit.reservation?.status

    if (!reservationId) {
      return
    }

    if (reservationStatus === 'proposal_pending' || reservationStatus === 'proposal_returned') {
      openProposalForm(unit, reservationId, expiresAt)
      return
    }

    openPreHoldForm(unit, reservationId, expiresAt)
  }

  function handleOpenMessages(unit: Unit) {
    const reservationId = unit.reservation?.id
    if (!reservationId) {
      return
    }

    setMessagesReservationId(reservationId)
    setMessagesOpen(true)
  }

  async function handleConfirmCancel(reason: string) {
    const unit = cancelUnit
    const reservationId = unit?.reservation?.id
    if (!unit || !reservationId) {
      return
    }

    try {
      setError(null)
      setCancellingUnitId(unit.id)
      await brokerApi.cancelReservation(reservationId, reason)
      onReserved()
    } catch {
      throw new Error('cancel_failed')
    } finally {
      setCancellingUnitId(null)
    }
  }

  function toggleGarage(id: number) {
    setSelectedGarageIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
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
            setPreHoldFormOpen(false)
            setProposalOpen(false)
            setCancelUnit(null)
            setGaragePickerUnit(null)
            setError(null)
          }
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{building?.name ?? 'Unidades'}</DialogTitle>
            <DialogDescription>
              Selecione uma unidade disponível para iniciar a pré-reserva. Vagas de garagem só podem
              ser atreladas à reserva da unidade.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <ul className="divide-y rounded-lg border">
            {listedUnits.map((unit) => {
              const spec = formatUnitSpecSummary(unit)
              const amenities = formatAmenityNames(unit.amenities)
              const competence = formatPriceCompetence(unit.price_competence)
              const garage = isGarageUnit(unit)

              return (
              <li key={unit.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="font-medium">
                    {unit.code}
                    {garage ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">vaga</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {unitStatusLabels[unit.status as keyof typeof unitStatusLabels] ?? unit.status}
                    {` · ${formatListedPrice(unit.price)}`}
                  </p>
                  {spec ? <p className="text-xs text-muted-foreground">{spec}</p> : null}
                  {amenities ? <p className="text-xs text-muted-foreground">{amenities}</p> : null}
                  {unit.price && competence ? (
                    <p className="text-xs text-muted-foreground">
                      Corrigido pelo INCC-M · competência {competence}
                    </p>
                  ) : null}
                </div>
                <UnitRowActions
                  unit={unit}
                  holdingUnitId={holdingUnitId}
                  onPreReserve={handlePreReserveClick}
                  onContinueReservation={handleContinueReservation}
                  onCancelReservation={setCancelUnit}
                  onOpenMessages={handleOpenMessages}
                  cancelling={cancellingUnitId === unit.id}
                />
              </li>
              )
            })}
            {listedUnits.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhuma unidade liberada neste empreendimento.
              </li>
            ) : null}
          </ul>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog
        open={garagePickerUnit !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setGaragePickerUnit(null)
            setSelectedGarageIds([])
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vagas de garagem</DialogTitle>
            <DialogDescription>
              Opcional: escolha 0 ou mais vagas disponíveis para a unidade{' '}
              {garagePickerUnit?.code ?? ''}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="space-y-3">
              {availableGarages.map((garage) => {
                const checked = selectedGarageIds.includes(garage.id)

                return (
                  <li key={garage.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={`Selecionar vaga ${garage.code}`}
                      className="flex size-4 shrink-0 items-center justify-center rounded border border-input text-xs data-[checked=true]:border-primary data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground"
                      data-checked={checked ? 'true' : 'false'}
                      onClick={() => toggleGarage(garage.id)}
                    >
                      {checked ? '✓' : null}
                    </button>
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">{garage.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatListedPrice(garage.price)}
                        {garage.private_area_m2 ? ` · ${garage.private_area_m2} m²` : ''}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGaragePickerUnit(null)
                setSelectedGarageIds([])
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={garagePickerUnit === null || holdingUnitId !== null}
              onClick={() => {
                if (garagePickerUnit) {
                  void submitPreHold(garagePickerUnit, selectedGarageIds)
                }
              }}
            >
              {holdingUnitId !== null ? 'Pré-reservando...' : 'Continuar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BrokerPreHoldDialog
        open={preHoldFormOpen}
        onOpenChange={(nextOpen) => {
          pollingPausedRef.current = nextOpen
          setPreHoldFormOpen(nextOpen)
          if (!nextOpen) {
            setPreHoldReservationId(null)
            setPreHoldExpiresAt(null)
          }
        }}
        unit={selectedUnit}
        reservationId={preHoldReservationId}
        expiresAt={preHoldExpiresAt}
        onReserved={() => {
          setPreHoldFormOpen(false)
          onOpenChange(false)
          onReserved()
        }}
      />

      <BrokerReservationDialog
        open={proposalOpen}
        onOpenChange={(nextOpen) => {
          pollingPausedRef.current = nextOpen
          setProposalOpen(nextOpen)
          if (!nextOpen) {
            setPreHoldReservationId(null)
            setPreHoldExpiresAt(null)
          }
        }}
        unit={selectedUnit}
        reservationId={preHoldReservationId}
        expiresAt={preHoldExpiresAt}
        client={selectedUnit?.reservation?.client ?? null}
        onReserved={() => {
          setProposalOpen(false)
          onOpenChange(false)
          onReserved()
        }}
      />

      <ReservationCancelDialog
        open={cancelUnit !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setCancelUnit(null)
          }
        }}
        clientName={cancelUnit?.reservation?.client?.name}
        onConfirm={handleConfirmCancel}
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
