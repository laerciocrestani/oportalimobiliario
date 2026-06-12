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
import { brokerApi, type Unit } from '@/lib/api'
import { useState } from 'react'

type BrokerUnitsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  building: BuildingWithUnits | null
  onReserved: () => void
}

function UnitRowActions({
  unit,
  onReserve,
  onCancelReservation,
  onOpenMessages,
  cancelling,
}: {
  unit: Unit
  onReserve: (unit: Unit) => void
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

  if (unit.status === 'available') {
    return (
      <Button size="sm" onClick={() => onReserve(unit)}>
        Reservar
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
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [messagesReservationId, setMessagesReservationId] = useState<number | null>(null)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [cancellingUnitId, setCancellingUnitId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleReserveClick(unit: Unit) {
    setSelectedUnit(unit)
    setReservationOpen(true)
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
              Selecione uma unidade disponível para reservar.
            </DialogDescription>
          </DialogHeader>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <ul className="divide-y rounded-lg border">
            {building?.units.map((unit) => (
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
                  onReserve={handleReserveClick}
                  onCancelReservation={(target) => void handleCancelReservation(target)}
                  onOpenMessages={handleOpenMessages}
                  cancelling={cancellingUnitId === unit.id}
                />
              </li>
            ))}
            {building && building.units.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhuma unidade liberada neste empreendimento.
              </li>
            ) : null}
          </ul>
        </DialogContent>
      </Dialog>

      <BrokerReservationDialog
        open={reservationOpen}
        onOpenChange={setReservationOpen}
        unit={selectedUnit}
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
