import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ApiRequestError, builderApi, brokerApi } from '@/lib/api'

type ProposalSignatureResendProps = {
  profile: 'broker' | 'builder'
  reservationId: number
  document?: 'proposal' | 'contract'
}

export function ProposalSignatureResend({
  profile,
  reservationId,
  document = 'proposal',
}: ProposalSignatureResendProps) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  async function handleResend() {
    setPending(true)
    setMessage(null)
    setFailed(false)

    try {
      const api = profile === 'builder' ? builderApi : brokerApi
      const result =
        document === 'contract'
          ? await api.resendContractSignatureLinks(reservationId)
          : await api.resendProposalSignatureLinks(reservationId)
      setMessage(
        result.notified === 1
          ? 'Link reenviado para 1 pessoa que ainda não assinou.'
          : `Link reenviado para ${result.notified} pessoas que ainda não assinaram.`,
      )
    } catch (error) {
      setFailed(true)
      setMessage(
        error instanceof ApiRequestError ? error.message : 'Não foi possível reenviar o link.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">
        Quem ainda não assinou recebe o link de novo no WhatsApp e no e-mail, quando houver e-mail.
      </p>
      <div>
        <Button type="button" variant="outline" disabled={pending} onClick={() => void handleResend()}>
          {pending ? 'Reenviando...' : 'Reenviar link de assinatura'}
        </Button>
      </div>
      {message ? (
        <p className={failed ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{message}</p>
      ) : null}
    </div>
  )
}
