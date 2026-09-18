import { useMemo, type ReactNode } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ReservationActionsMenu } from '@/components/reservations/ReservationActionsMenu'
import { ReservationPendingActionBadge } from '@/components/reservations/ReservationPendingActionBadge'
import { ReservationWaitingStatus } from '@/components/reservations/ReservationWaitingStatus'
import { RESERVATION_KANBAN_COLUMNS } from '@/components/reservations/reservation-kanban'
import { GripVerticalIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BuilderReservationListItem, ReservationKanbanColumn } from '@/lib/api'
import { cn } from '@/lib/utils'

type ReservationKanbanBoardProps = {
  profile: 'builder' | 'broker'
  reservations: BuilderReservationListItem[]
  cancellingId: number | null
  canCancel: boolean
  canMessage: boolean
  onOpen: (reservationId: number) => void
  onMessages: (reservationId: number) => void
  onCancel: (reservation: BuilderReservationListItem) => void
  onMove: (reservation: BuilderReservationListItem, column: ReservationKanbanColumn) => void
}

export function ReservationKanbanBoard({
  profile,
  reservations,
  cancellingId,
  canCancel,
  canMessage,
  onOpen,
  onMessages,
  onCancel,
  onMove,
}: ReservationKanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const grouped = useMemo(() => {
    const columns: Record<ReservationKanbanColumn, BuilderReservationListItem[]> = {
      pre_reservation: [],
      proposal_review: [],
      proposal_formalization: [],
      docs_deposit: [],
      contract: [],
      sold: [],
      cancelled: [],
    }

    for (const reservation of reservations) {
      const column = reservation.kanban_column ?? 'pre_reservation'
      columns[column].push(reservation)
    }

    return columns
  }, [reservations])

  function handleDragEnd(event: DragEndEvent) {
    const reservation = reservations.find((item) => item.id === Number(event.active.id))
    const column = resolveColumn(event.over?.id, event.over?.data.current)

    if (!reservation || column === null || column === reservation.kanban_column) {
      return
    }

    onMove(reservation, column)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex h-full min-h-0 flex-1 gap-3 overflow-x-auto">
        {RESERVATION_KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column.id}
            label={column.label}
            count={grouped[column.id].length}
          >
            {grouped[column.id].map((reservation) => (
              <KanbanCard
                key={reservation.id}
                profile={profile}
                reservation={reservation}
                cancelling={cancellingId === reservation.id}
                canCancel={canCancel}
                canMessage={canMessage}
                onOpen={() => onOpen(reservation.id)}
                onMessages={() => onMessages(reservation.id)}
                onCancel={() => onCancel(reservation)}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>
    </DndContext>
  )
}

function KanbanColumn({
  column,
  label,
  count,
  children,
}: {
  column: ReservationKanbanColumn
  label: string
  count: number
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
    data: { column },
  })

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        'flex h-full min-h-0 w-72 shrink-0 flex-col gap-3 rounded-xl border bg-muted/30 p-3',
        isOver ? 'border-ring ring-2 ring-ring/40' : null,
      )}
    >
      <header className="flex shrink-0 items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">{label}</h2>
        <span className="text-xs text-muted-foreground">{count}</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">{children}</div>
    </section>
  )
}

function KanbanCard({
  profile,
  reservation,
  cancelling,
  canCancel,
  canMessage,
  onOpen,
  onMessages,
  onCancel,
}: {
  profile: 'builder' | 'broker'
  reservation: BuilderReservationListItem
  cancelling: boolean
  canCancel: boolean
  canMessage: boolean
  onOpen: () => void
  onMessages: () => void
  onCancel: () => void
}) {
  const canDrag = (reservation.allowed_kanban_moves ?? []).length > 0
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: reservation.id,
    disabled: !canDrag,
    data: { column: reservation.kanban_column },
  })
  const clientName = reservation.client?.name ?? `Reserva ${reservation.id}`
  const place = [
    reservation.unit?.building?.name,
    reservation.unit?.code,
  ].filter(Boolean).join(' · ')

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'shrink-0 rounded-lg border bg-background p-3 shadow-sm',
        isDragging ? 'z-10 opacity-80' : null,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {canDrag ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab text-muted-foreground"
            aria-label={`Mover ${clientName}`}
            {...listeners}
            {...attributes}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : null}
        <Button
          variant="link"
          className="h-auto min-w-0 justify-start p-0 text-left font-medium text-foreground"
          onClick={onOpen}
        >
          {clientName}
        </Button>
        <ReservationActionsMenu
          reservation={reservation}
          cancelling={cancelling}
          canCancel={canCancel}
          canMessage={canMessage}
          onTimeline={onOpen}
          onMessages={onMessages}
          onCancel={onCancel}
        />
      </div>
      <p className="text-xs text-muted-foreground">{place || '—'}</p>
      {profile === 'builder' && reservation.broker?.name ? (
        <p className="text-xs text-muted-foreground">{reservation.broker.name}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1 pt-1">
        {reservation.needs_action ? (
          <ReservationPendingActionBadge pendingAction={reservation.pending_action} />
        ) : null}
        <ReservationWaitingStatus
          profile={profile}
          waitingOn={reservation.situation.current.waiting_on}
          reservationStatus={reservation.status}
          needsAction={reservation.needs_action}
        />
      </div>
    </article>
  )
}

function resolveColumn(
  overId: string | number | undefined,
  data: Record<string, unknown> | undefined,
): ReservationKanbanColumn | null {
  if (typeof data?.column === 'string') {
    return data.column as ReservationKanbanColumn
  }

  if (typeof overId === 'string' && RESERVATION_KANBAN_COLUMNS.some((column) => column.id === overId)) {
    return overId as ReservationKanbanColumn
  }

  return null
}
