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
    createDraft: vi.fn(),
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

vi.mock('@/apps/broker/components/BrokerPreHoldDialog', () => ({
  BrokerPreHoldDialog: () => null,
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

async function openFloor(name: RegExp) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name }))
  return user
}

describe('BrokerUnitsDialog', () => {
  beforeEach(() => {
    vi.mocked(brokerApi.createPreHold).mockReset()
    vi.mocked(brokerApi.cancelReservation).mockReset()
    vi.mocked(brokerApi.listUnits).mockReset()
  })

  it('asks to consult when the calculated price is missing', () => {
    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={{
          ...building,
          units: [
            {
              id: 20,
              code: '1301',
              floor: 13,
              area_m2: '80',
              price: null,
              price_base: '500000',
              status: 'available',
            },
          ],
        }}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: /13º andar/ })).toHaveTextContent('Valor sob consulta')
    expect(screen.queryByText(/500000/)).not.toBeInTheDocument()
  })

  it('summarizes the floor and reveals the reserve action when it opens', async () => {
    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={building}
        onReserved={() => {}}
      />,
    )

    const floor = screen.getByRole('button', { name: /12º andar/ })
    expect(floor).toHaveTextContent('1 de 3 unidades - 72 m²')
    expect(floor).toHaveTextContent(/R\$\s*450\.000,00/)
    expect(screen.queryByRole('button', { name: 'Reservar' })).not.toBeInTheDocument()

    await openFloor(/12º andar/)

    expect(screen.getByRole('button', { name: 'Reservar' })).toBeInTheDocument()
    expect(screen.getAllByText('72 m²').length).toBeGreaterThan(0)
  })

  it('shows a dashed reserved card for units held by another broker', async () => {
    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={building}
        onReserved={() => {}}
      />,
    )

    await openFloor(/12º andar/)

    const card = screen.getByText('Reservado').closest('[data-unit-status="pre_reserved"]')
    expect(card).toHaveClass('border-dashed')
    expect(card).toHaveAttribute('aria-disabled', 'true')
  })

  it('shows sold units as dashed cards that cannot be reserved', async () => {
    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={{
          ...building,
          units: [
            {
              id: 40,
              code: '401',
              floor: 4,
              bedrooms: 2,
              area_m2: '100',
              price: '98000',
              status: 'available',
            },
            {
              id: 41,
              code: '402',
              floor: 4,
              bedrooms: 2,
              area_m2: '123',
              price: '232000',
              status: 'sold',
            },
            {
              id: 42,
              code: '403',
              floor: 4,
              bedrooms: 3,
              area_m2: '110',
              price: '150000',
              status: 'reserved',
            },
          ],
        }}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: /4º andar/ })).toHaveTextContent('2 e 3 dorms')
    expect(screen.getByText('1 de 3 unidades - 100 a 123 m²')).toBeInTheDocument()

    await openFloor(/4º andar/)

    const sold = screen.getByText('Vendido').closest('[data-unit-status="sold"]')
    const reserved = screen.getByText('Reservado').closest('[data-unit-status="reserved"]')

    expect(sold).toHaveClass('border-dashed')
    expect(sold).toHaveAttribute('aria-disabled', 'true')
    expect(reserved).toHaveClass('border-dashed')
    expect(reserved).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getAllByRole('button', { name: 'Reservar' })).toHaveLength(1)
  })

  it('shows client reservation and remove button', async () => {
    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={building}
        onReserved={() => {}}
      />,
    )

    await openFloor(/12º andar/)

    expect(screen.getByText('Reservado para Ana Silva')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover reserva' })).toBeInTheDocument()
  })

  it('creates a proposal draft before opening the proposal dialog', async () => {
    const user = userEvent.setup()

    vi.mocked(brokerApi.createDraft).mockResolvedValue({
      id: 77,
      unit_id: 10,
      client_id: null,
      broker_id: 1,
      status: 'proposal_draft',
      expires_at: null,
      draft_expires_at: '2026-07-10T21:20:00.000000Z',
    })

    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={building}
        onReserved={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /12º andar/ }))
    await user.click(screen.getByRole('button', { name: 'Reservar' }))

    await waitFor(() => {
      expect(brokerApi.createDraft).toHaveBeenCalledWith(10, [])
    })
  })

  it('does not show Reservar for garage spots', async () => {
    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={{
          ...building,
          units: [
            {
              id: 30,
              code: 'S1-01',
              floor: -1,
              floor_kind: 'garage',
              area_m2: null,
              private_area_m2: '12.5',
              price: '45000',
              status: 'available',
            },
            {
              id: 10,
              code: '1201',
              floor: 12,
              area_m2: '72',
              price: '450000',
              status: 'available',
            },
          ],
        }}
        onReserved={() => {}}
      />,
    )

    await openFloor(/Subsolo 1/)

    expect(screen.getByText('S1-01')).toBeInTheDocument()
    expect(screen.getByText('Vaga disponível')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reservar' })).not.toBeInTheDocument()

    await openFloor(/12º andar/)

    expect(screen.getAllByRole('button', { name: 'Reservar' })).toHaveLength(1)
  })

  it('lets the broker optionally attach garage spots before reserving', async () => {
    const user = userEvent.setup()

    vi.mocked(brokerApi.createDraft).mockReset()
    vi.mocked(brokerApi.createDraft).mockResolvedValue({
      id: 88,
      unit_id: 10,
      client_id: null,
      broker_id: 1,
      status: 'proposal_draft',
      expires_at: null,
      draft_expires_at: '2026-07-10T21:20:00.000000Z',
      garage_units: [{ id: 30, code: 'S1-01', price: '45000', status: 'pre_reserved', floor_kind: 'garage' }],
    })

    render(
      <BrokerUnitsDialog
        open
        onOpenChange={() => {}}
        building={{
          ...building,
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
              id: 30,
              code: 'S1-01',
              floor: -1,
              floor_kind: 'garage',
              area_m2: null,
              private_area_m2: '12.5',
              price: '45000',
              status: 'available',
            },
          ],
        }}
        onReserved={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /12º andar/ }))
    await user.click(screen.getByRole('button', { name: 'Reservar' }))

    expect(screen.getByRole('heading', { name: 'Vagas de garagem' })).toBeInTheDocument()
    expect(brokerApi.createDraft).not.toHaveBeenCalled()

    await user.click(screen.getByRole('checkbox', { name: 'Selecionar vaga S1-01' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => {
      expect(brokerApi.createDraft).toHaveBeenCalledWith(10, [30])
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

    await user.click(screen.getByRole('button', { name: /12º andar/ }))
    await user.click(screen.getByRole('button', { name: 'Remover reserva' }))

    expect(brokerApi.cancelReservation).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Motivo *'), 'Cliente desistiu')
    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }))

    await waitFor(() => {
      expect(brokerApi.cancelReservation).toHaveBeenCalledWith(99, 'Cliente desistiu')
      expect(onReserved).toHaveBeenCalled()
    })
  })
})
