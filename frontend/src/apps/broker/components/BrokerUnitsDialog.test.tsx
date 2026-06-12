import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerUnitsDialog } from '@/apps/broker/components/BrokerUnitsDialog'
import type { BuildingWithUnits } from '@/apps/broker/lib/group-units-by-building'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    cancelReservation: vi.fn(),
  },
}))

vi.mock('@/apps/broker/components/BrokerReservationDialog', () => ({
  BrokerReservationDialog: () => null,
}))

import { brokerApi } from '@/lib/api'

const building: BuildingWithUnits = {
  id: 1,
  name: 'Aurora',
  description: null,
  city: 'São Paulo',
  state: 'SP',
  published: true,
  seo_title: null,
  seo_description: null,
  units: [
    {
      id: 10,
      code: '1201',
      floor: 12,
      area_m2: '72',
      price: '450000',
      status: 'available',
    },
    {
      id: 11,
      code: '1202',
      floor: 12,
      area_m2: '72',
      price: '460000',
      status: 'reserved',
      reservation: {
        id: 99,
        unit_id: 11,
        client_id: 2,
        broker_id: 1,
        expires_at: '2026-06-14T12:00:00.000000Z',
        client: {
          id: 2,
          name: 'Ana Silva',
          phone: '(11) 88888-8888',
          email: null,
        },
      },
    },
  ],
}

describe('BrokerUnitsDialog', () => {
  it('shows reserve button for available units', () => {
    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={building}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Reservar' })).toBeInTheDocument()
  })

  it('shows client reservation and remove button', () => {
    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={building}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByText('Reservado para Ana Silva')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover reserva' })).toBeInTheDocument()
  })

  it('cancels reservation and refreshes list', async () => {
    const user = userEvent.setup()
    const onReserved = vi.fn()

    vi.mocked(brokerApi.cancelReservation).mockResolvedValue(undefined)

    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={building}
        onReserved={onReserved}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remover reserva' }))

    await waitFor(() => {
      expect(brokerApi.cancelReservation).toHaveBeenCalledWith(99)
      expect(onReserved).toHaveBeenCalled()
    })
  })
})
