import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerReservationDialog } from '@/apps/broker/components/BrokerReservationDialog'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    submitReservationProposal: vi.fn(),
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

const attachedClient = {
  id: 2,
  name: 'Ana Silva',
  phone: '(11) 88888-8888',
  email: 'ana@example.com',
}

const validProposal = {
  client_name: 'Ana Silva',
  client_phone: '(11) 88888-8888',
  payment_terms: 'Entrada de R$ 50.000 + 24x de R$ 5.000',
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
    expect(screen.queryByLabelText('Nome do cliente *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Telefone *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('CPF *')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Ana Silva')).toBeInTheDocument()
      expect(screen.getByText('(11) 88888-8888')).toBeInTheDocument()
    })
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
      expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Proposta *'), validProposal.payment_terms)

    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeDisabled()

    const file = new File(['proposta'], 'proposta.pdf', { type: 'application/pdf' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file)
    await user.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    await waitFor(() => {
      expect(brokerApi.submitReservationProposal).toHaveBeenCalledWith(
        55,
        {
          client_name: attachedClient.name,
          client_phone: attachedClient.phone,
          payment_terms: validProposal.payment_terms,
        },
        [file],
      )
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
      expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    expect(brokerApi.releasePreHold).not.toHaveBeenCalled()
  })

  it('shows a returned proposal alert that opens the dialogue', async () => {
    const user = userEvent.setup()
    const onOpenDialogue = vi.fn()

    render(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        reservationId={55}
        expiresAt={null}
        releaseHoldOnClose={false}
        client={attachedClient}
        proposal={{
          id: 8,
          version: 1,
          client_name: attachedClient.name,
          client_phone: attachedClient.phone,
          payment_terms: 'Entrada de R$ 20.000',
          decision: 'returned',
          decision_note: 'Ajustar condições de pagamento.',
          submitted_by: 2,
          decided_by: 3,
          decided_at: '2026-08-22T12:00:00.000Z',
          created_at: '2026-08-22T11:00:00.000Z',
          client_email: '',
          client_cpf: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          marital_status: '',
          nationality: '',
          land_value: 0,
        }}
        onOpenDialogue={onOpenDialogue}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByText('Proposta devolvida')).toBeInTheDocument()
    expect(screen.getByText('Ajustar condições de pagamento.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abrir diálogo' }))

    expect(onOpenDialogue).toHaveBeenCalledOnce()
  })
})
