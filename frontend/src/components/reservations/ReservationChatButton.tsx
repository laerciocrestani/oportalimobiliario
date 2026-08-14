import { Button } from '@/components/ui/button'
import { MessageSquareIcon } from 'lucide-react'

type ReservationChatButtonProps = {
  label: string
  needsReply: boolean
  onClick: () => void
}

export function ReservationChatButton({ label, needsReply, onClick }: ReservationChatButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="relative text-muted-foreground"
      aria-label={needsReply ? `Conversar — ${label} · nova` : `Conversar — ${label}`}
      onClick={onClick}
    >
      <MessageSquareIcon />
      {needsReply ? (
        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-destructive" />
      ) : null}
    </Button>
  )
}
