import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerUnitsDialog } from '@/apps/broker/components/BrokerUnitsDialog'
import type { BuildingWithUnits } from '@/apps/broker/lib/group-units-by-building'

vi.mock('sonner', () => ({
  toast: {
    message: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/api', () => ({
  brokerApi: {
    cancelReservation: vi.fn(),
    createPreHold: vi.fn(),
    listUnits: vi.fn(),
  },
  ApiRequestError: class ApiRequestError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
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
      status: 'pre_reserved',
      pre_hold: {
        reservation_id: 55,
        expires_at: '2026-07-10T21:00:00.000000Z',
        held_by_me: false,
      },
    },
    {
      id: 12,
      code: '1203',
      floor: 12,
      area_m2: '72',
      price: '470000',
      status: 'reserved',
      reservation: {
        id: 99,
        unit_id: 12,
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
  it('shows pre-reserve button for available units', () => {
    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={building}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Pré-reservar' })).toBeInTheDocument()
  })

  it('shows pre-reserved label for units held by another broker', () => {
    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={building}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByText('Pré-reservada')).toBeInTheDocument()
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

  it('creates pre-hold before opening reservation dialog', async () => {
    const user = userEvent.setup()

    vi.mocked(brokerApi.createPreHold).mockResolvedValue({
      id: 77,
      unit_id: 10,
      client_id: null,
      broker_id: 1,
      status: 'pre_hold',
      expires_at: '2026-07-10T21:10:00.000000Z',
    })

    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={building}
        onReserved={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Pré-reservar' }))

    await waitFor(() => {
      expect(brokerApi.createPreHold).toHaveBeenCalledWith(10)
    })
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
