import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerReservationDialog } from '@/apps/broker/components/BrokerReservationDialog'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    listClients: vi.fn(),
    createReservation: vi.fn(),
  },
}))

vi.mock('@/apps/broker/components/BrokerNewClientDialog', () => ({
  BrokerNewClientDialog: () => null,
}))

import { brokerApi } from '@/lib/api'

const unit = {
  id: 10,
  code: '1201',
  floor: 12,
  area_m2: '72',
  price: '450000',
  status: 'available',
  building: {
    id: 1,
    name: 'Aurora',
    description: null,
    city: 'São Paulo',
    state: 'SP',
    published: true,
    seo_title: null,
    seo_description: null,
  },
}

describe('BrokerReservationDialog', () => {
  it('disables confirm until a client is selected', async () => {
    vi.mocked(brokerApi.listClients).mockResolvedValue([
      { id: 1, name: 'João', phone: '(11) 99999-9999', email: null },
    ])

    render(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Confirmar reserva' })).toBeDisabled()

    await waitFor(() => {
      expect(brokerApi.listClients).toHaveBeenCalled()
    })
  })

  it('creates reservation with selected client', async () => {
    const user = userEvent.setup()
    const onReserved = vi.fn()

    vi.mocked(brokerApi.listClients).mockResolvedValue([
      { id: 2, name: 'Ana', phone: '(11) 88888-8888', email: 'ana@example.com' },
    ])
    vi.mocked(brokerApi.createReservation).mockResolvedValue({
      id: 99,
      unit_id: 10,
      client_id: 2,
      broker_id: 1,
      expires_at: '2026-06-14T12:00:00.000000Z',
    })

    render(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        onReserved={onReserved}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Ana · (11) 88888-8888' })).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText('Cliente *'), '2')
    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    await waitFor(() => {
      expect(brokerApi.createReservation).toHaveBeenCalledWith(10, 2, undefined)
      expect(onReserved).toHaveBeenCalled()
    })
  })

  it('sends observations when provided', async () => {
    const user = userEvent.setup()

    vi.mocked(brokerApi.listClients).mockResolvedValue([
      { id: 2, name: 'Ana', phone: '(11) 88888-8888', email: null },
    ])
    vi.mocked(brokerApi.createReservation).mockResolvedValue({
      id: 99,
      unit_id: 10,
      client_id: 2,
      broker_id: 1,
      expires_at: '2026-06-14T12:00:00.000000Z',
    })

    render(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        onReserved={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Ana · (11) 88888-8888' })).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText('Cliente *'), '2')
    await user.type(screen.getByLabelText('Observações'), 'Cliente prefere unidade de canto.')
    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    await waitFor(() => {
      expect(brokerApi.createReservation).toHaveBeenCalledWith(
        10,
        2,
        'Cliente prefere unidade de canto.',
      )
    })
  })
})
