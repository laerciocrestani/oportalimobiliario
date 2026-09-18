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
import { ReservationHoldCountdown } from '@/components/reservations/ReservationHoldCountdown'
import {
  KANBAN_CARD_ACTIONS,
  RESERVATION_KANBAN_COLUMNS,
  avatarToneClass,
  clientInitials,
  resolveKanbanDrop,
  type KanbanColumnTheme,
} from '@/components/reservations/reservation-kanban'
import { Building2Icon, MessageCircleIcon, ReplyIcon, type LucideIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
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
  onProcessRequired: (reservation: BuilderReservationListItem) => void
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
  reservations,
  cancellingId,
  canCancel,
  canMessage,
  onOpen,
  onMessages,
  onCancel,
  onMove,
  onProcessRequired,
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

    if (!reservation) {
      return
    }

    const decision = resolveKanbanDrop(reservation, column)

    if (decision === 'ignore') {
      return
    }

    if (decision === 'process_required') {
      onProcessRequired(reservation)
      return
    }

    onMove(reservation, column as ReservationKanbanColumn)
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
            theme={column.theme}
            emptyDescription={column.emptyDescription}
            count={grouped[column.id].length}
          >
            {grouped[column.id].map((reservation) => (
              <KanbanCard
                key={reservation.id}
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
          <KanbanCardPreview reservation={activeReservation} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  column,
  label,
  icon: Icon,
  theme,
  emptyDescription,
  count,
  children,
}: {
  column: ReservationKanbanColumn
  label: string
  icon: LucideIcon
  theme: KanbanColumnTheme
  emptyDescription: string
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
        'flex h-full min-h-0 w-80 shrink-0 flex-col gap-3 rounded-2xl p-3',
        theme.column,
        isOver ? cn('ring-2', theme.ring) : null,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              theme.iconWrap,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <h2 className={cn('min-w-0 text-sm font-semibold leading-5', theme.title)}>{label}</h2>
        </div>
        <span className={cn('text-sm font-medium', theme.count)}>{count}</span>
      </header>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {count === 0 ? (
          <Empty className="min-h-48 flex-1 border-0 p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon" className={theme.iconWrap}>
                <Icon />
              </EmptyMedia>
              <EmptyTitle>Nenhuma reserva aqui</EmptyTitle>
              <EmptyDescription className="text-xs">{emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

function KanbanCard({
  reservation,
  cancelling,
  canCancel,
  canMessage,
  onOpen,
  onMessages,
  onCancel,
}: {
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
        'relative shrink-0 rounded-2xl border bg-background p-4',
        isDragging ? 'opacity-40' : null,
      )}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer rounded-2xl border-0 bg-transparent shadow-none"
        aria-label={`Abrir andamento de ${reservation.client?.name ?? `Reserva ${reservation.id}`}`}
        onClick={onOpen}
      />
      <KanbanCardBody
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
  reservation,
}: {
  reservation: BuilderReservationListItem
}) {
  return (
    <article className="w-72 cursor-grabbing rounded-2xl border bg-background p-4">
      <KanbanCardBody reservation={reservation} />
    </article>
  )
}

function KanbanCardBody({
  reservation,
  dragHandle,
  actions,
  onOpen,
}: {
  reservation: BuilderReservationListItem
  dragHandle?: {
    attributes: ReturnType<typeof useDraggable>['attributes']
    listeners: ReturnType<typeof useDraggable>['listeners']
  } | null
  actions?: ReactNode
  onOpen?: () => void
}) {
  const clientName = reservation.client?.name ?? `Reserva ${reservation.id}`
  const buildingName = reservation.unit?.building?.name
  const unitCode = reservation.unit?.code
  const cardAction = reservation.pending_action
    ? KANBAN_CARD_ACTIONS[reservation.pending_action]
    : null
  const avatar = (
    <Avatar size="default" className="size-9">
      <AvatarFallback className={cn('text-xs font-semibold', avatarToneClass(reservation.id))}>
        {clientInitials(clientName)}
      </AvatarFallback>
    </Avatar>
  )

  return (
    <div className="pointer-events-none relative flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {dragHandle ? (
          <button
            type="button"
            className="pointer-events-auto shrink-0 cursor-grab rounded-full"
            aria-label={`Mover ${clientName}`}
            {...dragHandle.listeners}
            {...dragHandle.attributes}
          >
            {avatar}
          </button>
        ) : (
          avatar
        )}
        <p className="min-w-0 flex-1 truncate font-semibold leading-none">{clientName}</p>
        {actions ? <div className="pointer-events-auto shrink-0">{actions}</div> : null}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <Building2Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="truncate text-xs text-muted-foreground">{buildingName || '—'}</p>
        </div>
        {unitCode ? (
          <p className="pl-6 text-xs text-muted-foreground">Unid. {unitCode}</p>
        ) : null}
      </div>
      {reservation.kanban_column === 'pre_reservation' && reservation.expires_at ? (
        <ReservationHoldCountdown
          createdAt={reservation.created_at}
          expiresAt={reservation.expires_at}
        />
      ) : null}
      {reservation.needs_action && cardAction && onOpen ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <MessageCircleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{cardAction.hint}</span>
          </p>
          <Button type="button" className="pointer-events-auto w-full" onClick={onOpen}>
            <ReplyIcon data-icon="inline-start" />
            {cardAction.label}
          </Button>
        </div>
      ) : null}
    </div>
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
