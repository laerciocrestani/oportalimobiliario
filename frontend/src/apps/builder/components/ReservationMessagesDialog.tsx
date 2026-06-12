import { useEffect, useState } from 'react'
import { InboxIcon, SendIcon, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { builderApi, brokerApi, type ReservationMessage } from '@/lib/api'
import { notifyReservationBadgeRefresh } from '@/lib/reservation-badge-events'

type ReservationMessagesDialogProps = {
  profile: 'builder' | 'broker'
  reservationId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMessageSent?: () => void
}

const MESSAGE_PREVIEW_MAX_LENGTH = 200

function isLongMessage(body: string): boolean {
  return body.length > MESSAGE_PREVIEW_MAX_LENGTH
}

function truncateMessage(body: string): string {
  return `${body.slice(0, MESSAGE_PREVIEW_MAX_LENGTH).trimEnd()}...`
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function isSentByCurrentProfile(
  message: ReservationMessage,
  profile: ReservationMessagesDialogProps['profile'],
): boolean {
  return message.author.role === profile
}

function messageDirectionTag(
  message: ReservationMessage,
  profile: ReservationMessagesDialogProps['profile'],
): { label: string; className: string; Icon: LucideIcon } {
  const authorName = message.author.name

  if (isSentByCurrentProfile(message, profile)) {
    return {
      label: `${authorName}`,
      className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
      Icon: SendIcon,
    }
  }

  return {
    label: `${authorName}`,
    className: 'bg-green-500/15 text-green-700 dark:text-green-400',
    Icon: InboxIcon,
  }
}

export function ReservationMessagesDialog({
  profile,
  reservationId,
  open,
  onOpenChange,
  onMessageSent,
}: ReservationMessagesDialogProps) {
  const [messages, setMessages] = useState<ReservationMessage[]>([])
  const [expandedMessage, setExpandedMessage] = useState<ReservationMessage | null>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const api = profile === 'builder' ? builderApi : brokerApi

  useEffect(() => {
    if (!open || reservationId === null) {
      return
    }

    setLoading(true)
    setError(null)

    void api
      .listReservationMessages(reservationId)
      .then(setMessages)
      .catch(() => setError('Não foi possível carregar a conversa.'))
      .finally(() => setLoading(false))
  }, [api, open, reservationId])

  function resetState() {
    setBody('')
    setError(null)
    setMessages([])
    setExpandedMessage(null)
  }

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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetState()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conversa da reserva</DialogTitle>
          <DialogDescription>
            Troca de mensagens entre construtora e corretor sobre esta reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
          ) : null}

          {!loading && messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          ) : null}

          <ul className="flex flex-col divide-y rounded-lg border">
            {messages.map((message) => {
              const tag = messageDirectionTag(message, profile)

              return (
                <li key={message.id} className="flex flex-col gap-2 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className={tag.className}>
                      <tag.Icon data-icon="inline-start" />
                      {tag.label}
                    </Badge>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(message.created_at)}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{message.author.name}</span>
                  <Separator />
                  {isLongMessage(message.body) ? (
                    <div className="flex flex-col items-start gap-1">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {truncateMessage(message.body)}
                      </p>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => setExpandedMessage(message)}
                      >
                        Leia mais
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{message.body}</p>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="space-y-2">
            <Label htmlFor="reservation-message">Sua mensagem</Label>
            <textarea
              id="reservation-message"
              className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva sua resposta..."
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            type="button"
            disabled={body.trim() === '' || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog
        open={expandedMessage !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setExpandedMessage(null)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {expandedMessage ? (
            <>
              <DialogHeader>
                <DialogTitle>{expandedMessage.author.name}</DialogTitle>
                <DialogDescription>
                  {formatDateTime(expandedMessage.created_at)} ·{' '}
                  {messageDirectionTag(expandedMessage, profile).label}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm whitespace-pre-wrap">{expandedMessage.body}</p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setExpandedMessage(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
