import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReservationAttachmentPreview } from '@/components/reservations/ReservationAttachmentPreview'
import { builderApi, type ReservationAttachment } from '@/lib/api'

type BuilderContractValidatePanelProps = {
  reservationId: number
  attachment: ReservationAttachment
  onValidated: () => void
}

export function BuilderContractValidatePanel({
  reservationId,
  attachment,
  onValidated,
}: BuilderContractValidatePanelProps) {
  const [govSigned, setGovSigned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleValidate() {
    if (!govSigned) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await builderApi.validateSignedContract(reservationId)
      onValidated()
    } catch {
      setError('Não foi possível validar o contrato e concluir a venda.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Validação final</p>
        <p className="text-sm text-muted-foreground">
          Confira o PDF assinado e registre a assinatura GOV da construtora para marcar a unidade
          como vendida.
        </p>
      </div>

      <ReservationAttachmentPreview attachment={attachment} />

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={govSigned}
          onChange={(event) => setGovSigned(event.target.checked)}
          disabled={submitting}
        />
        Assinatura GOV da construtora registrada
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" disabled={!govSigned || submitting} onClick={() => void handleValidate()}>
        {submitting ? 'Processando...' : 'Validar e concluir venda'}
      </Button>
    </div>
  )
}
