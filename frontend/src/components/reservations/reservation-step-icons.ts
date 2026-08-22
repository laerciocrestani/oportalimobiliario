import {
  Building2Icon,
  CalendarClockIcon,
  ClipboardListIcon,
  ClockIcon,
  FilePenLineIcon,
  FilePlusIcon,
  FileTextIcon,
  FileUpIcon,
  KeyRoundIcon,
  MessageSquareIcon,
  PenLineIcon,
  ReceiptIcon,
  ScaleIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from 'lucide-react'

export const RESERVATION_STEP_KEYS = [
  'pre_hold_created',
  'dialogue',
  'proposal_submitted',
  'proposal_decision',
  'deposit_window',
  'deposit_proof',
  'contract_data',
  'contract_issue',
  'contract_sign_gov',
  'contract_upload',
  'contract_builder_sign',
  'contract_validate',
  'sold',
] as const

export type ReservationStepKey = (typeof RESERVATION_STEP_KEYS)[number]

export const RESERVATION_STEP_ICONS: Record<ReservationStepKey, LucideIcon> = {
  pre_hold_created: CalendarClockIcon,
  dialogue: MessageSquareIcon,
  proposal_submitted: FileTextIcon,
  proposal_decision: ScaleIcon,
  deposit_window: ClockIcon,
  deposit_proof: ReceiptIcon,
  contract_data: ClipboardListIcon,
  contract_issue: FilePlusIcon,
  contract_sign_gov: PenLineIcon,
  contract_upload: FileUpIcon,
  contract_builder_sign: FilePenLineIcon,
  contract_validate: ShieldCheckIcon,
  sold: KeyRoundIcon,
}

export function reservationStepIcon(stepKey: string): LucideIcon {
  return RESERVATION_STEP_ICONS[stepKey as ReservationStepKey] ?? Building2Icon
}
