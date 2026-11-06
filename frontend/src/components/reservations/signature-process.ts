import type { SignatureProcessParty, SignatureProcessPartyState } from '@/lib/api'

const PARTY_ORDER = ['builder', 'broker', 'buyer'] as const

export function signaturePartyState(
  parties: SignatureProcessParty[],
  role: SignatureProcessParty['role'],
): SignatureProcessPartyState {
  const party = parties.find((item) => item.role === role)

  if (party?.status === 'signed') {
    return 'done'
  }

  if (party?.status === 'refused') {
    return 'refused'
  }

  const current = PARTY_ORDER
    .map((itemRole) => parties.find((item) => item.role === itemRole))
    .find((item) => item?.status === 'pending')

  return current?.role === role ? 'processing' : 'waiting'
}

export function formatSignatureSentAt(value: string): string {
  const date = new Date(value)
  const day = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

  return `${day} às ${time}`
}

export function formatSignatureTimeLeft(dueAt: string, now = Date.now()): string {
  const remaining = new Date(dueAt).getTime() - now

  if (remaining <= 0) {
    return 'encerrado'
  }

  const totalMinutes = Math.ceil(remaining / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`
  }

  return `${minutes}min`
}
