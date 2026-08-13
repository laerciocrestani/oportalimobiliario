import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReservationAttachmentPreview } from '@/components/reservations/ReservationAttachmentPreview'
import { builderApi, type ReservationAttachment } from '@/lib/api'

type BuilderDepositProofApprovalPanelProps = {
  reservationId: number
  attachment: ReservationAttachment
  onApproved: () => void
}

export function BuilderDepositProofApprovalPanel({
  reservationId,
  attachment,
  onApproved,
}: BuilderDepositProofApprovalPanelProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setSubmitting(true)
    setError(null)

    try {
      await builderApi.approveDepositProof(reservationId)
      onApproved()
    } catch {
      setError('Não foi possível validar o comprovante.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Comprovante de sinal</p>
        <p className="text-sm text-muted-foreground">
          Revise o arquivo enviado pelo corretor antes de liberar a etapa de contrato.
        </p>
      </div>

      <ReservationAttachmentPreview attachment={attachment} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" disabled={submitting} onClick={() => void handleApprove()}>
        {submitting ? 'Processando...' : 'Validar comprovante'}
      </Button>
    </div>
  )
}
