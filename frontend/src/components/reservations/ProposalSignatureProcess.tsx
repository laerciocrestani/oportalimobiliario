import { CircleCheckIcon, Loader2Icon, XCircleIcon } from 'lucide-react'
import { ProposalSignatureResend } from '@/components/reservations/ProposalSignatureResend'
import { formatSignatureSentAt } from '@/components/reservations/signature-process'
import type { SignatureProcess, SignatureProcessParty } from '@/lib/api'
import { cn } from '@/lib/utils'

const PARTY_TITLE: Record<SignatureProcessParty['role'], string> = {
  builder: 'Gestor',
  broker: 'Corretor',
  buyer: 'Comprador',
  witness: 'Testemunha',
}

type ProposalSignatureProcessProps = {
  process: SignatureProcess
  document?: 'proposal' | 'contract'
  className?: string
  resend?: {
    profile: 'broker' | 'builder'
    reservationId: number
    document?: 'proposal' | 'contract'
  }
}

function partyTitle(party: SignatureProcessParty): string {
  if (party.role === 'witness') {
    return party.key === 'witness-2' ? 'Testemunha 2' : 'Testemunha 1'
  }

  return PARTY_TITLE[party.role]
}

export function ProposalSignatureProcess({
  process,
  document = 'proposal',
  className,
  resend,
}: ProposalSignatureProcessProps) {
  const sentAt = formatSignatureSentAt(process.sent_at)
  const signedLabel = document === 'contract' ? 'Contrato assinado' : 'Proposta assinada'

  return (
    <ol className={cn('flex flex-col', className)}>
      {process.parties.map((party, index) => {
        const title = partyTitle(party)
        const signed = party.status === 'signed'
        const refused = party.status === 'refused'
        const who = party.name.trim() === '' ? title : party.name

        return (
          <li key={party.key ?? party.role} className="relative flex gap-3 pb-4 last:pb-0">
            {index < process.parties.length - 1 ? (
              <span aria-hidden className="absolute top-4 bottom-0 left-[7px] w-px bg-border" />
            ) : null}
            <PartyIcon status={party.status} />
            <div className="flex min-w-0 flex-col gap-1">
              <p className={cn('text-sm', signed ? 'text-foreground' : 'text-muted-foreground')}>
                {signed && party.signed_at
                  ? `${signedLabel} dia ${formatSignatureSentAt(party.signed_at)}`
                  : refused
                    ? `${title} recusou a assinatura`
                    : `Aguardando assinatura ${title}`}
              </p>
              {signed ? (
                <p className="text-sm text-muted-foreground">{title} · {who}</p>
              ) : refused ? null : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{who} | {sentAt}</span>
                  {resend ? (
                    <ProposalSignatureResend
                      inline
                      profile={resend.profile}
                      reservationId={resend.reservationId}
                      document={resend.document ?? document}
                      role={party.role === 'witness' ? undefined : party.role}
                      signerKey={document === 'contract' ? party.key : undefined}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function PartyIcon({ status }: { status: SignatureProcessParty['status'] }) {
  const className = 'relative z-10 mt-0.5 size-4 shrink-0 bg-background'

  if (status === 'signed') {
    return <CircleCheckIcon aria-hidden className={cn(className, 'text-green-600')} />
  }

  if (status === 'refused') {
    return <XCircleIcon aria-hidden className={cn(className, 'text-muted-foreground')} />
  }

  return <Loader2Icon aria-hidden className={cn(className, 'animate-spin text-muted-foreground')} />
}
