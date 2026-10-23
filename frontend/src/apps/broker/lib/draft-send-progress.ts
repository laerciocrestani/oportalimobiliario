export const PROPOSAL_DRAFT_TTL_MS = 20 * 60 * 1000
const RED_REMAINING_MS = 5 * 60 * 1000

export type DraftSendTone = 'green' | 'yellow' | 'red'

export type DraftSendProgress = {
  label: string
  percent: number
  tone: DraftSendTone
  expired: boolean
}

export function draftSendProgress(expiresAt: string, now = Date.now()): DraftSendProgress {
  const remainingMs = new Date(expiresAt).getTime() - now
  const expired = remainingMs <= 0
  const clamped = expired ? 0 : remainingMs
  const percent = Math.min(100, Math.max(0, Math.round((clamped / PROPOSAL_DRAFT_TTL_MS) * 100)))
  const tone: DraftSendTone = clamped <= RED_REMAINING_MS
    ? 'red'
    : percent >= 50
      ? 'green'
      : 'yellow'

  const totalSeconds = Math.floor(clamped / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return {
    label: `${minutes}:${String(seconds).padStart(2, '0')}`,
    percent,
    tone,
    expired,
  }
}
