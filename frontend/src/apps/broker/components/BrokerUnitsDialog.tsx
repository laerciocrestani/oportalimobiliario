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
import {
  bedroomSummary,
  floorPriceSummary,
  floorStockSummary,
  floorTitle,
  groupUnitsByFloor,
  type BrokerFloorRow,
} from '@/apps/broker/lib/broker-floor-rows'
import type { BuildingWithUnits } from '@/apps/broker/lib/group-units-by-building'
import { brokerApi, ApiRequestError, type FloorKind, type GarageUnit, type Unit } from '@/lib/api'
import {
  formatListedPrice,
  formatPriceCompetence,
  formatUnitSpecSummary,
} from '@/lib/unit-listing'
import {
  buildStatusSnapshot,
  detectPreHoldTransitionToast,
  PRE_RESERVE_POLL_MS,
} from '@/lib/reservation-polling'
import { cn } from '@/lib/utils'
import { Building2Icon, ChevronDownIcon, DoorOpenIcon, StoreIcon, WarehouseIcon, type LucideIcon } from 'lucide-react'
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
  holdingUnitId: string | null
  onPreReserve: (unit: Unit) => void
  onContinueReservation: (unit: Unit) => void
  onCancelReservation: (unit: Unit) => void
  onOpenMessages: (unit: Unit) => void
  cancelling: boolean
}) {
  if (isGarageUnit(unit)) {
    if (unit.status !== 'available') {
      return null
    }

    return <p className="text-sm text-muted-foreground">Vaga disponível</p>
  }

  const clientName = unit.reservation?.client?.name

  if (clientName) {
    return (
      <div className="flex w-full flex-col gap-2">
        <p className="text-sm">Reservado para {clientName}</p>
        <Button size="sm" variant="secondary" className="w-full" onClick={() => onOpenMessages(unit)}>
          Ver conversa
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={cancelling}
          onClick={() => onCancelReservation(unit)}
        >
          {cancelling ? 'Removendo...' : 'Remover reserva'}
        </Button>
      </div>
    )
  }

  if (unit.status === 'pre_reserved' && (unit.pre_hold?.held_by_me || unit.reservation)) {
    return (
      <Button
        size="sm"
        className="w-full"
        disabled={holdingUnitId === unit.id}
        onClick={() => onContinueReservation(unit)}
      >
        {holdingUnitId === unit.id ? 'Reservando...' : 'Continuar reserva'}
      </Button>
    )
  }

  if (unit.status === 'available') {
    return (
      <Button
        size="sm"
        className="w-full"
        disabled={holdingUnitId === unit.id}
        onClick={() => onPreReserve(unit)}
      >
        {holdingUnitId === unit.id ? 'Reservando...' : 'Reservar'}
      </Button>
    )
  }

  return null
}

const FLOOR_ROW_TONE = {
  hall: 'bg-amber-100 dark:bg-amber-950/40',
  residential: 'bg-[#e4efe0] dark:bg-[#1c2b1e]',
  commercial: 'bg-orange-100 dark:bg-orange-950/35',
  garage: 'bg-sky-100 dark:bg-sky-950/40',
} as const

const UNIT_CARD_TONE = {
  open: 'bg-card ring-1 ring-foreground/10',
  sold: 'border border-dashed border-slate-400 bg-slate-50 text-slate-700 dark:bg-slate-950/40 dark:text-slate-200',
  reserved: 'border border-dashed border-orange-500 bg-orange-50 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100',
  pre_reserved: 'border border-dashed border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
  unavailable: 'border border-dashed border-red-400 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-100',
} as const

function floorTone(row: BrokerFloorRow): keyof typeof FLOOR_ROW_TONE {
  if (row.kind === 'garage' || (row.floor != null && row.floor < 0)) {
    return 'garage'
  }

  if (row.kind === 'hall' || row.kind === 'commercial' || row.kind === 'residential') {
    return row.kind
  }

  return 'residential'
}

function floorIcon(kind: FloorKind | null, floor: number | null): LucideIcon {
  if (kind === 'garage' || (floor != null && floor < 0)) {
    return WarehouseIcon
  }

  if (kind === 'commercial') {
    return StoreIcon
  }

  if (kind === 'hall') {
    return DoorOpenIcon
  }

  return Building2Icon
}

function unitCardTone(unit: Unit): keyof typeof UNIT_CARD_TONE {
  if (unit.status === 'sold' || unit.status === 'reserved' || unit.status === 'pre_reserved' || unit.status === 'unavailable') {
    return unit.status
  }

  return 'open'
}

function unitStatusStamp(unit: Unit): string | null {
  if (unit.status === 'sold') {
    return 'Vendido'
  }

  if (unit.status === 'unavailable') {
    return 'Indisponível'
  }

  if (unit.reservation?.client?.name) {
    return null
  }

  if (unit.status === 'reserved' || unit.status === 'pre_reserved') {
    return 'Reservado'
  }

  return null
}

function FloorMapRow({
  row,
  title,
  showBedrooms,
  expanded,
  priceMode,
  holdingUnitId,
  cancellingUnitId,
  onToggle,
  onPreReserve,
  onContinueReservation,
  onCancelReservation,
  onOpenMessages,
}: {
  row: BrokerFloorRow
  title: string
  showBedrooms: boolean
  expanded: boolean
  priceMode?: 'incc' | 'fixed'
  holdingUnitId: string | null
  cancellingUnitId: string | null
  onToggle: () => void
  onPreReserve: (unit: Unit) => void
  onContinueReservation: (unit: Unit) => void
  onCancelReservation: (unit: Unit) => void
  onOpenMessages: (unit: Unit) => void
}) {
  const Icon = floorIcon(row.kind, row.floor)
  const bedrooms = row.kind === 'garage' ? null : bedroomSummary(row.units)
  const unitsId = `broker-floor-${row.key}`
  const tone = floorTone(row)

  return (
    <div data-floor-tone={tone} className={cn('flex w-full flex-col rounded-lg', FLOOR_ROW_TONE[tone])}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={unitsId}
        onClick={onToggle}
        className={cn(
          'grid w-full grid-cols-1 items-center gap-x-4 gap-y-1 px-3 py-3 text-left',
          showBedrooms
            ? 'sm:grid-cols-[max-content_max-content_minmax(0,1fr)_max-content_max-content]'
            : 'sm:grid-cols-[max-content_minmax(0,1fr)_max-content_max-content]',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background/80 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="font-medium">{title}</span>
        </span>
        {showBedrooms ? <span className="text-sm text-muted-foreground">{bedrooms}</span> : null}
        <span className="text-sm">{floorStockSummary(row.units, row.kind === 'garage')}</span>
        <span className="text-sm font-medium tabular-nums whitespace-nowrap sm:text-right">{floorPriceSummary(row.units)}</span>
        <ChevronDownIcon className={cn('size-4 justify-self-end transition-transform', expanded && 'rotate-180')} />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden" inert={expanded ? undefined : true} aria-hidden={expanded ? undefined : true}>
          <div id={unitsId} className="flex flex-wrap gap-2 p-2">
            {row.units.map((unit) => (
              <UnitFloorCard
                key={unit.id}
                unit={unit}
                priceMode={priceMode}
                holdingUnitId={holdingUnitId}
                cancelling={cancellingUnitId === unit.id}
                onPreReserve={onPreReserve}
                onContinueReservation={onContinueReservation}
                onCancelReservation={onCancelReservation}
                onOpenMessages={onOpenMessages}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function UnitFloorCard({
  unit,
  priceMode,
  holdingUnitId,
  cancelling,
  onPreReserve,
  onContinueReservation,
  onCancelReservation,
  onOpenMessages,
}: {
  unit: Unit
  priceMode?: 'incc' | 'fixed'
  holdingUnitId: string | null
  cancelling: boolean
  onPreReserve: (unit: Unit) => void
  onContinueReservation: (unit: Unit) => void
  onCancelReservation: (unit: Unit) => void
  onOpenMessages: (unit: Unit) => void
}) {
  const tone = unitCardTone(unit)
  const stamp = unitStatusStamp(unit)
  const hasOwnActions = Boolean(unit.reservation?.client?.name) || Boolean(unit.pre_hold?.held_by_me)
  const locked = tone !== 'open' && !hasOwnActions
  const area = formatUnitSpecSummary({
    private_area_m2: unit.private_area_m2,
    area_m2: unit.area_m2,
  })
  const competence = formatPriceCompetence(unit.price_competence)

  return (
    <div
      data-unit-status={unit.status}
      aria-disabled={locked || undefined}
      className={cn('flex w-fit min-w-36 flex-col items-start gap-1 rounded-xl px-3 py-3 text-left', UNIT_CARD_TONE[tone])}
    >
      <span className="text-sm font-bold tabular-nums">{unit.code}</span>
      {stamp ? <span className="text-xs font-semibold tracking-wide uppercase">{stamp}</span> : null}
      <span className="text-sm font-bold tabular-nums whitespace-nowrap">{formatListedPrice(unit.price)}</span>
      {area ? <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">{area}</span> : null}
      {unit.price && competence && priceMode !== 'fixed' ? (
        <span className="text-xs text-muted-foreground whitespace-nowrap">INCC-M · {competence}</span>
      ) : null}
      {priceMode === 'fixed' && unit.price ? (
        <span className="text-xs text-muted-foreground">Valor fixo</span>
      ) : null}
      <div className="mt-1 w-full">
        <UnitRowActions
          unit={unit}
          holdingUnitId={holdingUnitId}
          onPreReserve={onPreReserve}
          onContinueReservation={onContinueReservation}
          onCancelReservation={onCancelReservation}
          onOpenMessages={onOpenMessages}
          cancelling={cancelling}
        />
      </div>
    </div>
  )
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
  const [proposalGarageUnits, setProposalGarageUnits] = useState<GarageUnit[]>([])
  const [messagesReservationId, setMessagesReservationId] = useState<number | null>(null)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [cancellingUnitId, setCancellingUnitId] = useState<string | null>(null)
  const [cancelUnit, setCancelUnit] = useState<Unit | null>(null)
  const [holdingUnitId, setHoldingUnitId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [garagePickerUnit, setGaragePickerUnit] = useState<Unit | null>(null)
  const [selectedGarageIds, setSelectedGarageIds] = useState<number[]>([])
  const [openFloorKey, setOpenFloorKey] = useState<string | null>(null)

  const previousStatusRef = useRef(buildStatusSnapshot(building?.units ?? []))
  const toastShownForRef = useRef(new Set<number>())
  const pollingPausedRef = useRef(false)

  const availableGarages = useMemo(
    () => units.filter((unit) => isGarageUnit(unit) && unit.status === 'available'),
    [units],
  )

  const floorRows = useMemo(() => groupUnitsByFloor(units), [units])
  const showTowerName = useMemo(() => {
    const names = new Set(floorRows.flatMap((row) => (row.towerName ? [row.towerName] : [])))
    return names.size > 1
  }, [floorRows])
  const showBedrooms = useMemo(
    () => floorRows.some((row) => row.kind !== 'garage' && bedroomSummary(row.units) != null),
    [floorRows],
  )

  useEffect(() => {
    if (!open || !building) {
      return
    }

    setUnits(building.units)
    previousStatusRef.current = buildStatusSnapshot(building.units)
    toastShownForRef.current.clear()
  }, [building, open])

  useEffect(() => {
    setOpenFloorKey(null)
  }, [building?.id, open])

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
            `Unidade ${toastTarget.unitCode} acaba de ser reservada por outro corretor.`,
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

  function openProposalForm(
    unit: Unit,
    reservationId: number,
    expiresAt: string | null,
    garageUnits: GarageUnit[] = [],
  ) {
    setSelectedUnit(unit)
    setProposalGarageUnits(garageUnits)
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

    void submitDraft(unit, [])
  }

  async function submitDraft(unit: Unit, garageUnitIds: number[]) {
    setHoldingUnitId(unit.id)
    setGaragePickerUnit(null)

    try {
      const reservation = await brokerApi.createDraft(unit.id, garageUnitIds)
      openProposalForm(
        unit,
        reservation.id,
        reservation.draft_expires_at ?? reservation.expires_at,
        reservation.garage_units ?? [],
      )
    } catch (err) {
      const message =
        err instanceof ApiRequestError && err.status === 422
          ? err.message
          : 'Não foi possível reservar a unidade.'

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

    if (
      reservationStatus === 'proposal_draft' ||
      reservationStatus === 'proposal_pending' ||
      reservationStatus === 'proposal_returned'
    ) {
      openProposalForm(unit, reservationId, expiresAt, unit.reservation?.garage_units ?? [])
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
        <DialogContent className="max-w-4xl sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{building?.name ?? 'Unidades'}</DialogTitle>
            <DialogDescription>
              Abra um pavimento para ver as unidades. Vendidas e reservadas não podem ser
              escolhidas. Vagas de garagem só entram na reserva da unidade.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {floorRows.length === 0 ? (
            <p className="rounded-lg border px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhuma unidade liberada neste empreendimento.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {floorRows.map((row) => (
                <FloorMapRow
                  key={row.key}
                  row={row}
                  title={showTowerName && row.towerName ? `${row.towerName} · ${floorTitle(row.floor, row.kind)}` : floorTitle(row.floor, row.kind)}
                  showBedrooms={showBedrooms}
                  expanded={openFloorKey === row.key}
                  priceMode={building?.price_mode}
                  holdingUnitId={holdingUnitId}
                  cancellingUnitId={cancellingUnitId}
                  onToggle={() => setOpenFloorKey((current) => (current === row.key ? null : row.key))}
                  onPreReserve={handlePreReserveClick}
                  onContinueReservation={handleContinueReservation}
                  onCancelReservation={setCancelUnit}
                  onOpenMessages={handleOpenMessages}
                />
              ))}
            </div>
          )}
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
                  void submitDraft(garagePickerUnit, selectedGarageIds)
                }
              }}
            >
              {holdingUnitId !== null ? 'Reservando...' : 'Continuar'}
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
            setProposalGarageUnits([])
          }
        }}
        unit={selectedUnit}
        garageUnits={proposalGarageUnits}
        reservationId={preHoldReservationId}
        expiresAt={preHoldExpiresAt}
        releaseHoldOnClose={false}
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
