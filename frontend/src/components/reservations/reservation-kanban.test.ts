import { describe, expect, it } from 'vitest'
import {
  BadgeCheckIcon,
  BanIcon,
  KeyRoundIcon,
  MessagesSquareIcon,
  PenLineIcon,
  ScaleIcon,
  WalletIcon,
} from 'lucide-react'
import { RESERVATION_KANBAN_COLUMNS } from '@/components/reservations/reservation-kanban'

describe('RESERVATION_KANBAN_COLUMNS', () => {
  it('maps every kanban column to a lucide icon', () => {
    expect(RESERVATION_KANBAN_COLUMNS).toHaveLength(7)
    expect(RESERVATION_KANBAN_COLUMNS.map((column) => [column.id, column.icon])).toEqual([
      ['pre_reservation', MessagesSquareIcon],
      ['proposal_review', ScaleIcon],
      ['proposal_formalization', BadgeCheckIcon],
      ['docs_deposit', WalletIcon],
      ['contract', PenLineIcon],
      ['sold', KeyRoundIcon],
      ['cancelled', BanIcon],
    ])
  })
})
