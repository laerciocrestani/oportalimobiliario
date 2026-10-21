import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerReservationDialog } from '@/apps/broker/components/BrokerReservationDialog'

vi.mock('@/lib/viacep', async () => {
  const actual = await vi.importActual<typeof import('@/lib/viacep')>('@/lib/viacep')

  return {
    ...actual,
    lookupCep: vi.fn().mockResolvedValue(null),
  }
})

vi.mock('@/lib/api', () => ({
  brokerApi: {
    submitReservationProposal: vi.fn(),
    releasePreHold: vi.fn(),
    listReservationProposalTemplates: vi.fn().mockResolvedValue([]),
  },
}))

import { brokerApi } from '@/lib/api'
import { formatListedPrice } from '@/lib/unit-listing'

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

const buyerPayload = {
  party_kind: 'individual' as const,
  client_cpf: '52998224725',
  client_rg: '123456789',
  address: 'Rua A, 100',
  city: 'São Paulo',
  state: 'SP',
  zip: '01000-000',
  marital_status: 'Solteiro(a)',
  nationality: 'brasileira',
  profession: 'Arquiteta',
}

async function fillIndividualBuyer(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('CPF'), '52998224725')
  await user.type(screen.getByLabelText('RG'), buyerPayload.client_rg)
  await user.selectOptions(screen.getByLabelText('Estado civil'), buyerPayload.marital_status)
  await user.type(screen.getByLabelText('Profissão'), buyerPayload.profession)
  await user.type(screen.getByLabelText('CEP'), '01000000')
  await user.type(screen.getByLabelText('Endereço'), buyerPayload.address)
  await user.type(screen.getByLabelText('Cidade'), buyerPayload.city)
  await user.type(screen.getByLabelText('UF'), buyerPayload.state)
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

    expect(screen.getByRole('heading', { name: 'Proposta' })).toBeInTheDocument()
    expect(screen.getByText('Unidade 1201')).toBeInTheDocument()
    expect(screen.getByText('Não informado')).toBeInTheDocument()
    expect(screen.getByText('A identificação das vagas não foi informada nesta proposta.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeDisabled()
    expect(screen.queryByLabelText('Cliente cadastrado')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Novo cliente' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nome do cliente *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Telefone *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('CPF *')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana Silva')).toBeInTheDocument()
      expect(screen.getByDisplayValue('(11) 88888-8888')).toBeInTheDocument()
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
      expect(screen.getByLabelText('Proposta *')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Proposta *'), validProposal.payment_terms)
    await fillIndividualBuyer(user)

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
          ...buyerPayload,
          payment_terms: validProposal.payment_terms,
          deposit_kind: 'pix',
          client_email: attachedClient.email,
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
      expect(screen.getByDisplayValue('Ana Silva')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    expect(brokerApi.releasePreHold).not.toHaveBeenCalled()
  })

  it('sends an asset deposit when the signal is already in the proposal', async () => {
    const user = userEvent.setup()
    const onReserved = vi.fn()

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
      expect(screen.getByLabelText('Proposta *')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Proposta *'), validProposal.payment_terms)
    await fillIndividualBuyer(user)
    await user.click(screen.getByRole('radio', { name: 'Bem já descrito na proposta' }))

    const file = new File(['proposta'], 'proposta.pdf', { type: 'application/pdf' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file)
    await user.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    await waitFor(() => {
      expect(brokerApi.submitReservationProposal).toHaveBeenCalledWith(
        55,
        expect.objectContaining({ deposit_kind: 'asset' }),
        [file],
      )
    })
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
          party_kind: 'individual',
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

  it('fills the builder template and submits the composed proposal', async () => {
    const user = userEvent.setup()
    const onReserved = vi.fn()

    vi.mocked(brokerApi.listReservationProposalTemplates).mockResolvedValueOnce([
      {
        id: 7,
        name: 'Proposta comercial padrão',
        body_markdown: 'Proponente: {{nome_cliente}}, telefone {{telefone_cliente}}, e-mail {{email_cliente}}.\n\nCondições: {{condicoes_pagamento}}.',
        variables: [
          { slug: 'nome_cliente', label: 'Nome do cliente' },
          { slug: 'telefone_cliente', label: 'Telefone do cliente' },
          { slug: 'email_cliente', label: 'E-mail do cliente' },
          { slug: 'condicoes_pagamento', label: 'Condições de pagamento' },
        ],
        prefill: {
          nome_cliente: attachedClient.name,
          telefone_cliente: attachedClient.phone,
          email_cliente: attachedClient.email,
        },
      },
    ])
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

    expect(await screen.findByLabelText('Condições de pagamento')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Modelo da construtora' })).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Ana Silva')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome do cliente')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeDisabled()

    await user.type(screen.getByLabelText('Condições de pagamento'), 'Entrada de R$ 50.000 + 24x')
    await fillIndividualBuyer(user)

    const file = new File(['proposta'], 'proposta.pdf', { type: 'application/pdf' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file)
    await user.click(screen.getByRole('button', { name: 'Enviar proposta' }))

    await waitFor(() => {
      expect(brokerApi.submitReservationProposal).toHaveBeenCalledWith(
        55,
        {
          client_name: 'Ana Silva',
          client_phone: '(11) 88888-8888',
          client_email: 'ana@example.com',
          ...buyerPayload,
          payment_terms: 'Proponente: Ana Silva, telefone (11) 88888-8888, e-mail ana@example.com.\n\nCondições: Entrada de R$ 50.000 + 24x.',
          deposit_kind: 'pix',
        },
        [file],
      )
      expect(onReserved).toHaveBeenCalled()
    })
  })

  it('shows the selected garage in the summary and keeps it out of the document', async () => {
    vi.mocked(brokerApi.listReservationProposalTemplates).mockResolvedValueOnce([
      {
        id: 7,
        name: 'Proposta comercial padrão',
        body_markdown: 'Unidade {{codigo_unidade}} · Box {{box}}\n\nEntrada {{valor_entrada}}',
        variables: [{ slug: 'valor_entrada', label: 'Valor de entrada', required: true }],
        prefill: { box: 'S1-01', nome_corretor: 'Danilo Reis' },
      },
    ])

    render(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={{ ...unit, building: { id: 1, name: 'Residencial Bosque', slug: 'bosque', active: true } }}
        garageUnits={[{ id: 30, code: 'S1-01', price: '45000', status: 'pre_reserved', floor_kind: 'garage' }]}
        reservationId={55}
        expiresAt="2099-01-01T12:00:00.000000Z"
        client={attachedClient}
        onReserved={() => {}}
      />,
    )

    expect(await screen.findByDisplayValue('Danilo Reis')).toBeInTheDocument()
    expect(screen.getByText('Residencial Bosque')).toBeInTheDocument()
    expect(screen.getByText('Unidade 1201')).toBeInTheDocument()
    expect(screen.getByText('S1-01')).toBeInTheDocument()
    expect(screen.getByText((text) => text.replace(/\s/g, ' ') === formatListedPrice('450000').replace(/\s/g, ' '))).toBeInTheDocument()
    expect(screen.getByText((text) => text.replace(/\s/g, ' ') === formatListedPrice('45000').replace(/\s/g, ' '))).toBeInTheDocument()
    expect(screen.queryByLabelText('Empreendimento')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Vagas de garagem')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Box')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Valor de entrada')).toBeInTheDocument()
  })

  it('paints the deadline green, yellow and red as time runs out', () => {
    const start = Date.parse('2026-10-16T12:00:00.000Z')
    const greenUntil = new Date(start + 15 * 60 * 1000).toISOString()
    const yellowUntil = new Date(start + 8 * 60 * 1000).toISOString()
    const redUntil = new Date(start + 4 * 60 * 1000).toISOString()
    vi.useFakeTimers()
    vi.setSystemTime(start)

    const { rerender, unmount } = render(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        reservationId={55}
        expiresAt={greenUntil}
        client={attachedClient}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByRole('progressbar')).toHaveAttribute('data-tone', 'green')

    rerender(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        reservationId={55}
        expiresAt={yellowUntil}
        client={attachedClient}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByRole('progressbar')).toHaveAttribute('data-tone', 'yellow')

    rerender(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        reservationId={55}
        expiresAt={redUntil}
        client={attachedClient}
        onReserved={() => {}}
      />,
    )

    expect(screen.getByRole('progressbar')).toHaveAttribute('data-tone', 'red')
    expect(screen.queryByText(/pré-reserva expirou/i)).not.toBeInTheDocument()

    rerender(
      <BrokerReservationDialog
        open
        onOpenChange={() => {}}
        unit={unit}
        reservationId={55}
        expiresAt={new Date(start - 60 * 1000).toISOString()}
        client={attachedClient}
        onReserved={() => {}}
      />,
    )

    const message = screen.getByText(/pré-reserva expirou/i)
    expect(screen.getByRole('progressbar').compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    unmount()
    vi.useRealTimers()
  })
})
