import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerPreHoldDialog } from '@/apps/broker/components/BrokerPreHoldDialog'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    listClients: vi.fn(),
    attachPreHoldClient: vi.fn(),
    releasePreHold: vi.fn(),
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
  status: 'pre_reserved',
}

describe('BrokerPreHoldDialog', () => {
  it('disables confirm until a client is selected', async () => {
    vi.mocked(brokerApi.listClients).mockResolvedValue([
      { id: 1, name: 'João', phone: '(11) 99999-9999', email: null },
    ])

    render(
      <BrokerPreHoldDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        reservationId={55}
        expiresAt="2099-01-01T12:00:00.000000Z"
        onReserved={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Confirmar pré-reserva' })).toBeDisabled()
    expect(screen.getByText('Pré-reserva')).toBeInTheDocument()

    await waitFor(() => {
      expect(brokerApi.listClients).toHaveBeenCalled()
    })
  })

  it('attaches selected client without submitting a proposal', async () => {
    const user = userEvent.setup()
    const onReserved = vi.fn()

    vi.mocked(brokerApi.listClients).mockResolvedValue([
      { id: 2, name: 'Ana', phone: '(11) 88888-8888', email: 'ana@example.com' },
    ])
    vi.mocked(brokerApi.attachPreHoldClient).mockResolvedValue({
      id: 55,
      unit_id: 10,
      client_id: 2,
      broker_id: 1,
      status: 'pre_hold',
      expires_at: null,
    })

    render(
      <BrokerPreHoldDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        reservationId={55}
        expiresAt="2099-01-01T12:00:00.000000Z"
        onReserved={onReserved}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Ana · (11) 88888-8888' })).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText('Cliente *'), '2')
    await user.type(screen.getByLabelText('Observações'), 'Cliente visitou a unidade')
    await user.click(screen.getByRole('button', { name: 'Confirmar pré-reserva' }))

    await waitFor(() => {
      expect(brokerApi.attachPreHoldClient).toHaveBeenCalledWith(55, 2, 'Cliente visitou a unidade')
      expect(onReserved).toHaveBeenCalled()
    })
  })

  it('releases pre-hold when cancelled', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    vi.mocked(brokerApi.listClients).mockResolvedValue([])
    vi.mocked(brokerApi.releasePreHold).mockResolvedValue(undefined)

    render(
      <BrokerPreHoldDialog
        open
        onOpenChange={onOpenChange}
        unit={unit}
        reservationId={55}
        expiresAt="2099-01-01T12:00:00.000000Z"
        onReserved={() => {}}
      />,
    )

    await waitFor(() => {
      expect(brokerApi.listClients).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => {
      expect(brokerApi.releasePreHold).toHaveBeenCalledWith(55)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
