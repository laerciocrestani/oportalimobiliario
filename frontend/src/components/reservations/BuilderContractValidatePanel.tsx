import { Button } from '@/components/ui/button'
import { ReservationAttachmentPreview } from '@/components/reservations/ReservationAttachmentPreview'
import type { ReservationAttachment } from '@/lib/api'

type BuilderContractValidatePanelProps = {
  title: string
  description: string
  attachment: ReservationAttachment
  actionLabel: string
  onAction: () => void
}

export function BuilderContractValidatePanel({
  title,
  description,
  attachment,
  actionLabel,
  onAction,
}: BuilderContractValidatePanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <ReservationAttachmentPreview attachment={attachment} />

      <Button type="button" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  )
}
