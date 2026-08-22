import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerReservationDialog } from '@/apps/broker/components/BrokerReservationDialog'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    listClients: vi.fn(),
    submitReservationProposal: vi.fn(),
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

const attachedClient = {
  id: 2,
  name: 'Ana Silva',
  phone: '(11) 88888-8888',
  email: 'ana@example.com',
}

const validProposal = {
  client_name: 'Ana Silva',
  client_email: 'ana@example.com',
  client_phone: '(11) 88888-8888',
  client_cpf: '12345678901',
  address: 'Rua A, 100',
  city: 'São Paulo',
  state: 'SP',
  zip: '01000-000',
  marital_status: 'solteira',
  nationality: 'brasileira',
  land_value: 50000,
  payment_terms: 'Pix R$ 10.000 + 24x',
}

describe('BrokerReservationDialog', () => {
  it('prefills the attached client and hides the client picker', async () => {
    render(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        reservationId={55}
        expiresAt="2099-01-01T12:00:00.000000Z"
        client={attachedClient}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeDisabled()
    expect(screen.queryByLabelText('Cliente cadastrado')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Novo cliente' })).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/Cliente da pré-reserva:/)).toBeInTheDocument()
      expect(screen.getByDisplayValue('Ana Silva')).toBeInTheDocument()
      expect(screen.getByDisplayValue('ana@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('(11) 88888-8888')).toBeInTheDocument()
    })

    expect(brokerApi.listClients).not.toHaveBeenCalled()
  })

  it('submits proposal using the attached client without selecting again', async () => {
    const user = userEvent.setup()
    const onReserved = vi.fn()

    vi.mocked(brokerApi.submitReservationProposal).mockResolvedValue({
      id: 55,
      unit_id: 10,
      client_id: 2,
      broker_id: 1,
      expires_at: null,
      status: 'proposal_pending',
    })

    render(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        reservationId={55}
        expiresAt="2099-01-01T12:00:00.000000Z"
        client={attachedClient}
        onReserved={onReserved}
      />,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana Silva')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('CPF *'), validProposal.client_cpf)
    await user.type(screen.getByLabelText('Endereço *'), validProposal.address)
    await user.type(screen.getByLabelText('Cidade *'), validProposal.city)
    await user.type(screen.getByLabelText('UF *'), validProposal.state)
    await user.type(screen.getByLabelText('CEP *'), validProposal.zip)
    await user.type(screen.getByLabelText('Estado civil *'), validProposal.marital_status)
    await user.type(screen.getByLabelText('Valor do terreno *'), String(validProposal.land_value))
    await user.type(screen.getByLabelText('Condições de pagamento *'), validProposal.payment_terms)
    await user.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    await waitFor(() => {
      expect(brokerApi.submitReservationProposal).toHaveBeenCalledWith(55, {
        client_name: attachedClient.name,
        client_email: attachedClient.email,
        client_phone: attachedClient.phone,
        client_cpf: validProposal.client_cpf,
        address: validProposal.address,
        city: validProposal.city,
        state: validProposal.state,
        zip: validProposal.zip,
        marital_status: validProposal.marital_status,
        nationality: 'brasileira',
        land_value: validProposal.land_value,
        payment_terms: validProposal.payment_terms,
      })
      expect(onReserved).toHaveBeenCalled()
    })
  })

  it('does not release pre-hold when closed from the timeline', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    vi.mocked(brokerApi.releasePreHold).mockResolvedValue(undefined)

    render(
      <BrokerReservationDialog
        open
        onOpenChange={onOpenChange}
        unit={unit}
        reservationId={55}
        expiresAt={null}
        releaseHoldOnClose={false}
        client={attachedClient}
        onReserved={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana Silva')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    expect(brokerApi.releasePreHold).not.toHaveBeenCalled()
  })
})
