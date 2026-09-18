import { useEffect, useState, type KeyboardEvent } from 'react'
import { ArrowDownIcon, MessageSquareIcon, SendIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { Skeleton } from '@/components/ui/skeleton'
import { builderApi, brokerApi, type ReservationMessage } from '@/lib/api'
import { notifyReservationBadgeRefresh } from '@/lib/reservation-badge-events'
import { cn } from '@/lib/utils'

type ReservationChatPanelProps = {
  profile: 'builder' | 'broker'
  reservationId: number | null
  active: boolean
  onMessageSent?: () => void
  readOnly?: boolean
  composerId?: string
  showHeading?: boolean
  className?: string
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function isSentByCurrentProfile(
  message: ReservationMessage,
  profile: ReservationChatPanelProps['profile'],
): boolean {
  return message.author.role === profile
}

export function ReservationChatPanel({
  profile,
  reservationId,
  active,
  onMessageSent,
  readOnly = false,
  composerId = 'reservation-message',
  showHeading = false,
  className,
}: ReservationChatPanelProps) {
  const [messages, setMessages] = useState<ReservationMessage[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const api = profile === 'builder' ? builderApi : brokerApi

  useEffect(() => {
    if (!active || reservationId === null) {
      return
    }

    setLoading(true)
    setError(null)

    void api
      .listReservationMessages(reservationId)
      .then(setMessages)
      .catch(() => setError('Não foi possível carregar a conversa.'))
      .finally(() => setLoading(false))
  }, [api, active, reservationId])

  async function handleSubmit() {
    if (reservationId === null || body.trim() === '') {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const message = await api.replyReservation(reservationId, body.trim())
      setMessages((current) => [...current, message])
      setBody('')
      notifyReservationBadgeRefresh()
      onMessageSent?.()
    } catch {
      setError('Não foi possível enviar a mensagem.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {showHeading ? (
        <div className="shrink-0 border-b px-4 py-3">
          <p className="font-medium">Diálogo</p>
          <p className="text-xs text-muted-foreground">Corretor e construtora</p>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {loading ? (
          <div className="flex flex-1 flex-col justify-end gap-4 p-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-12 w-2/3 self-end" />
          </div>
        ) : null}

        {!loading && messages.length === 0 ? (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquareIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhuma mensagem ainda</EmptyTitle>
              <EmptyDescription>Envie a primeira mensagem sobre esta reserva.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {!loading && messages.length > 0 ? (
          <MessageScrollerProvider autoScroll defaultScrollPosition="end">
            <MessageScroller className="flex-1">
              <MessageScrollerViewport aria-label="Mensagens da reserva">
                <MessageScrollerContent>
                  {messages.map((message) => {
                    const own = isSentByCurrentProfile(message, profile)

                    return (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={String(message.id)}
                        scrollAnchor={own}
                      >
                        <Message align={own ? 'end' : 'start'}>
                          <MessageAvatar>
                            <Avatar size="sm">
                              <AvatarFallback>{authorInitials(message.author.name)}</AvatarFallback>
                            </Avatar>
                          </MessageAvatar>
                          <MessageContent>
                            <MessageHeader>{message.author.name}</MessageHeader>
                            <Bubble variant={own ? 'default' : 'secondary'}>
                              <BubbleContent className="whitespace-pre-wrap">{message.body}</BubbleContent>
                            </Bubble>
                            <MessageFooter>{formatDateTime(message.created_at)}</MessageFooter>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    )
                  })}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton>
                <ArrowDownIcon />
                <span className="sr-only">Ir para o final</span>
              </MessageScrollerButton>
            </MessageScroller>
          </MessageScrollerProvider>
        ) : null}
      </div>

      {readOnly ? (
        <p className="border-t px-3 py-2 text-sm text-muted-foreground">
          Reserva cancelada — a conversa fica disponível apenas para consulta.
        </p>
      ) : (
        <form
          className="border-t p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <Field>
            <FieldLabel htmlFor={composerId} className="sr-only">
              Sua mensagem
            </FieldLabel>
            <InputGroup>
              <InputGroupTextarea
                id={composerId}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Escreva sua mensagem..."
                disabled={submitting}
                rows={2}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="submit"
                  size="icon-sm"
                  variant="default"
                  disabled={body.trim() === '' || submitting}
                  aria-label="Enviar"
                >
                  <SendIcon />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        </form>
      )}
    </div>
  )
}
