import { useMemo, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import { ReservationActionsMenu } from '@/components/reservations/ReservationActionsMenu'
import { ReservationPendingActionBadge } from '@/components/reservations/ReservationPendingActionBadge'
import { ReservationWaitingStatus } from '@/components/reservations/ReservationWaitingStatus'
import { RESERVATION_KANBAN_COLUMNS } from '@/components/reservations/reservation-kanban'
import { GripVerticalIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
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
  const [activeId, setActiveId] = useState<number | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )
  const activeReservation = activeId === null
    ? null
    : reservations.find((item) => item.id === activeId) ?? null

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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const reservation = reservations.find((item) => item.id === Number(event.active.id))
    const column = resolveColumn(event.over?.id, event.over?.data.current)

    setActiveId(null)

    if (!reservation || column === null || column === reservation.kanban_column) {
      return
    }

    onMove(reservation, column)
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full min-h-0 flex-1 gap-3 overflow-x-auto">
        {RESERVATION_KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column.id}
            label={column.label}
            icon={column.icon}
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
      <DragOverlay dropAnimation={dropAnimation}>
        {activeReservation ? (
          <KanbanCardPreview profile={profile} reservation={activeReservation} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  column,
  label,
  icon: Icon,
  count,
  children,
}: {
  column: ReservationKanbanColumn
  label: string
  icon: LucideIcon
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
      <header className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <h2 className="min-w-0 text-sm font-medium leading-5">{label}</h2>
        </div>
        <span className="text-xs text-muted-foreground">{count}</span>
      </header>
      <Separator />
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: reservation.id,
    disabled: !canDrag,
    data: { column: reservation.kanban_column },
  })

  return (
    <article
      ref={setNodeRef}
      className={cn(
        'shrink-0 rounded-lg border bg-background p-3 shadow-sm',
        isDragging ? 'opacity-40' : null,
      )}
    >
      <KanbanCardBody
        profile={profile}
        reservation={reservation}
        dragHandle={canDrag ? { attributes, listeners } : null}
        actions={
          <ReservationActionsMenu
            reservation={reservation}
            cancelling={cancelling}
            canCancel={canCancel}
            canMessage={canMessage}
            onTimeline={onOpen}
            onMessages={onMessages}
            onCancel={onCancel}
          />
        }
        onOpen={onOpen}
      />
    </article>
  )
}

function KanbanCardPreview({
  profile,
  reservation,
}: {
  profile: 'builder' | 'broker'
  reservation: BuilderReservationListItem
}) {
  return (
    <article className="w-64 cursor-grabbing rounded-lg border bg-background p-3 shadow-lg">
      <KanbanCardBody profile={profile} reservation={reservation} />
    </article>
  )
}

function KanbanCardBody({
  profile,
  reservation,
  dragHandle,
  actions,
  onOpen,
}: {
  profile: 'builder' | 'broker'
  reservation: BuilderReservationListItem
  dragHandle?: {
    attributes: ReturnType<typeof useDraggable>['attributes']
    listeners: ReturnType<typeof useDraggable>['listeners']
  } | null
  actions?: ReactNode
  onOpen?: () => void
}) {
  const clientName = reservation.client?.name ?? `Reserva ${reservation.id}`
  const place = [
    reservation.unit?.building?.name,
    reservation.unit?.code,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        {dragHandle ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab text-muted-foreground"
            aria-label={`Mover ${clientName}`}
            {...dragHandle.listeners}
            {...dragHandle.attributes}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : dragHandle === null ? null : (
          <span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden>
            <GripVerticalIcon className="size-4" />
          </span>
        )}
        {onOpen ? (
          <Button
            variant="link"
            className="h-auto min-w-0 justify-start p-0 text-left font-medium text-foreground"
            onClick={onOpen}
          >
            {clientName}
          </Button>
        ) : (
          <p className="min-w-0 font-medium">{clientName}</p>
        )}
        {actions}
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
    </>
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
