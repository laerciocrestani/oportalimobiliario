import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerPreHoldDialog } from '@/apps/broker/components/BrokerPreHoldDialog'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    listClients: vi.fn(),
    createClient: vi.fn(),
    attachPreHoldClient: vi.fn(),
    releasePreHold: vi.fn(),
  },
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

const existingClient = {
  id: 2,
  name: 'Ana Silva',
  phone: '(11) 98888-8888',
  email: 'ana@example.com',
}

function renderDialog(onReserved = vi.fn(), onOpenChange = vi.fn()) {
  render(
    <BrokerPreHoldDialog
      open
      onOpenChange={onOpenChange}
      unit={unit}
      reservationId={55}
      expiresAt="2099-01-01T12:00:00.000000Z"
      onReserved={onReserved}
    />,
  )

  return { onReserved, onOpenChange }
}

describe('BrokerPreHoldDialog', () => {
  it('keeps confirm disabled until name and phone are filled', async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(screen.getByRole('button', { name: 'Confirmar pré-reserva' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Novo cliente' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Nome *'), 'An')

    expect(brokerApi.listClients).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirmar pré-reserva' })).toBeDisabled()
  })

  it('searches clients from the third letter and fills phone and email on select', async () => {
    const user = userEvent.setup()
    const { onReserved } = renderDialog()

    vi.mocked(brokerApi.listClients).mockResolvedValue([existingClient])
    vi.mocked(brokerApi.attachPreHoldClient).mockResolvedValue({
      id: 55,
      unit_id: 10,
      client_id: 2,
      broker_id: 1,
      status: 'pre_hold',
      expires_at: null,
    })

    await user.type(screen.getByLabelText('Nome *'), 'Ana')

    expect(await screen.findByRole('status', { name: 'Buscando clientes' })).toBeInTheDocument()

    await waitFor(() => {
      expect(brokerApi.listClients).toHaveBeenCalledWith('Ana')
      expect(screen.queryByRole('status', { name: 'Buscando clientes' })).not.toBeInTheDocument()
    })

    await user.click(await screen.findByRole('option', { name: /Ana Silva/ }))
    expect(screen.getByLabelText('Telefone *')).toHaveValue('(11) 98888-8888')
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com')

    expect(
      screen.getByText(/Valor em dinheiro, terreno ou outra forma de entrada/),
    ).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Proposta de entrada'),
      'R$ 80.000 em dinheiro e um terreno de 300 m²',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar pré-reserva' }))

    await waitFor(() => {
      expect(brokerApi.createClient).not.toHaveBeenCalled()
      expect(brokerApi.attachPreHoldClient).toHaveBeenCalledWith(
        55,
        2,
        'R$ 80.000 em dinheiro e um terreno de 300 m²',
      )
      expect(onReserved).toHaveBeenCalled()
    })
  })

  it('creates a new client when the name is not found', async () => {
    const user = userEvent.setup()
    const { onReserved } = renderDialog()

    vi.mocked(brokerApi.listClients).mockResolvedValue([])
    vi.mocked(brokerApi.createClient).mockResolvedValue({
      id: 9,
      name: 'Carlos Lima',
      phone: '(11) 97777-6666',
      email: 'carlos@example.com',
    })
    vi.mocked(brokerApi.attachPreHoldClient).mockResolvedValue({
      id: 55,
      unit_id: 10,
      client_id: 9,
      broker_id: 1,
      status: 'pre_hold',
      expires_at: null,
    })

    await user.type(screen.getByLabelText('Nome *'), 'Carlos Lima')
    await user.type(screen.getByLabelText('Telefone *'), '11977776666')

    await waitFor(() => {
      expect(brokerApi.listClients).toHaveBeenCalledWith('Carlos Lima')
    })
    expect(
      await screen.findByText(/Nenhum cliente encontrado\. Este nome será cadastrado/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar pré-reserva' })).toBeEnabled()

    await user.type(screen.getByLabelText('E-mail'), 'carlos@example.com')
    await user.click(screen.getByRole('button', { name: 'Confirmar pré-reserva' }))

    await waitFor(() => {
      expect(brokerApi.createClient).toHaveBeenCalledWith({
        name: 'Carlos Lima',
        phone: '(11) 97777-6666',
        email: 'carlos@example.com',
      })
      expect(brokerApi.attachPreHoldClient).toHaveBeenCalledWith(55, 9, undefined)
      expect(onReserved).toHaveBeenCalled()
    })
  })

  it('releases pre-hold when cancelled', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog(vi.fn(), vi.fn())

    vi.mocked(brokerApi.releasePreHold).mockResolvedValue(undefined)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => {
      expect(brokerApi.releasePreHold).toHaveBeenCalledWith(55)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})