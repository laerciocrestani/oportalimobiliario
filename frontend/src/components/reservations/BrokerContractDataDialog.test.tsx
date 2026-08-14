import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BrokerContractDataDialog } from '@/components/reservations/BrokerContractDataDialog'
import type { ReservationProposal, ReservationTimelineClient } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    submitContractData: vi.fn(),
  },
}))

vi.mock('@/lib/viacep', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/viacep')>()
  return {
    ...actual,
    lookupCep: vi.fn(),
  }
})

import { brokerApi } from '@/lib/api'
import { lookupCep } from '@/lib/viacep'

const client: ReservationTimelineClient = {
  id: 2,
  name: 'Ana Silva',
  phone: '(11) 88888-8888',
  email: null,
}

const proposal: ReservationProposal = {
  id: 1,
  version: 1,
  client_name: 'Ana Silva',
  client_email: '',
  client_phone: '(11) 88888-8888',
  client_cpf: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  marital_status: '',
  nationality: 'brasileira',
  land_value: 50000,
  payment_terms: 'Pix R$ 10.000',
  decision: 'accepted',
  decision_note: null,
  submitted_by: 3,
  decided_by: 1,
  decided_at: '2026-07-10T19:00:00+00:00',
  created_at: '2026-07-10T18:00:00+00:00',
}

describe('BrokerContractDataDialog', () => {
  beforeEach(() => {
    vi.mocked(lookupCep).mockReset()
    vi.mocked(brokerApi.submitContractData).mockReset()
  })
  it('shows registered name and phone as read-only and keeps submit disabled until remaining fields are filled', () => {
    render(
      <BrokerContractDataDialog
        open
        onOpenChange={() => {}}
        reservationId={55}
        client={client}
        proposal={proposal}
        onSubmitted={() => {}}
      />,
    )

    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Silva')
    expect(screen.getByLabelText('Nome')).toBeDisabled()
    expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 88888-8888')
    expect(screen.getByLabelText('Telefone')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar dados do contrato' })).toBeDisabled()
  })

  it('shows an error for an invalid CPF', async () => {
    const user = userEvent.setup()

    render(
      <BrokerContractDataDialog
        open
        onOpenChange={() => {}}
        reservationId={55}
        client={client}
        proposal={proposal}
        onSubmitted={() => {}}
      />,
    )

    await user.type(screen.getByLabelText('CPF *'), '12345678901')

    expect(screen.getByText('CPF inválido.')).toBeInTheDocument()
    expect(screen.getByLabelText('CPF *')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Enviar dados do contrato' })).toBeDisabled()
  })

  it('shows an error when ViaCEP does not find the CEP', async () => {
    const user = userEvent.setup()

    vi.mocked(lookupCep).mockResolvedValue(null)

    render(
      <BrokerContractDataDialog
        open
        onOpenChange={() => {}}
        reservationId={55}
        client={client}
        proposal={proposal}
        onSubmitted={() => {}}
      />,
    )

    await user.type(screen.getByLabelText('CEP *'), '00000000')

    expect(await screen.findByText('CEP não encontrado.')).toBeInTheDocument()
  })

  it('fills address from ViaCEP when an 8-digit CEP is entered', async () => {
    const user = userEvent.setup()

    vi.mocked(lookupCep).mockResolvedValue({
      zip: '01001-000',
      address: 'Praça da Sé',
      city: 'São Paulo',
      state: 'SP',
    })

    render(
      <BrokerContractDataDialog
        open
        onOpenChange={() => {}}
        reservationId={55}
        client={client}
        proposal={proposal}
        onSubmitted={() => {}}
      />,
    )

    await user.type(screen.getByLabelText('CEP *'), '01001000')

    await waitFor(() => {
      expect(lookupCep).toHaveBeenCalledWith('01001-000', expect.any(AbortSignal))
      expect(screen.getByLabelText('Endereço *')).toHaveValue('Praça da Sé')
    })

    expect(screen.getByLabelText('Cidade *')).toHaveValue('São Paulo')
    expect(screen.getByLabelText('Estado *')).toHaveValue('SP')
    expect(screen.getByLabelText('CEP *')).toHaveValue('01001-000')
  })

  it('submits remaining client data and documentation', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()

    vi.mocked(lookupCep).mockResolvedValue({
      zip: '01001-000',
      address: 'Praça da Sé',
      city: 'São Paulo',
      state: 'SP',
    })
    vi.mocked(brokerApi.submitContractData).mockResolvedValue({
      status: 'contract_data_pending',
      attachments: [],
    })

    render(
      <BrokerContractDataDialog
        open
        onOpenChange={() => {}}
        reservationId={55}
        client={client}
        proposal={proposal}
        onSubmitted={onSubmitted}
      />,
    )

    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('CPF *'), '52998224725')
    expect(screen.getByLabelText('CPF *')).toHaveValue('529.982.247-25')
    await user.type(screen.getByLabelText('RG *'), '123456789')
    expect(screen.getByLabelText('RG *')).toHaveValue('123456789')
    await user.click(screen.getByRole('combobox', { name: 'Estado civil *' }))
    await user.click(await screen.findByRole('option', { name: 'Solteiro(a)' }))
    await user.type(screen.getByLabelText('CEP *'), '01001000')

    await waitFor(() => {
      expect(screen.getByLabelText('Endereço *')).toHaveValue('Praça da Sé')
    })

    await user.type(screen.getByLabelText('Endereço *'), ', 100')

    const rg = new File(['rg'], 'rg.pdf', { type: 'application/pdf' })
    const cpf = new File(['cpf'], 'cpf.pdf', { type: 'application/pdf' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, [rg, cpf])

    expect(screen.getByText('rg.pdf')).toBeInTheDocument()
    expect(screen.getByText('cpf.pdf')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enviar dados do contrato' }))

    await waitFor(() => {
      expect(brokerApi.submitContractData).toHaveBeenCalledWith(
        55,
        expect.objectContaining({
          client_name: 'Ana Silva',
          client_phone: '(11) 88888-8888',
          client_email: 'ana@example.com',
          client_cpf: '52998224725',
          client_rg: '123456789',
          address: 'Praça da Sé, 100',
          city: 'São Paulo',
          state: 'SP',
          zip: '01001-000',
          marital_status: 'Solteiro(a)',
          nationality: 'brasileira',
        }),
        [rg, cpf],
      )
      expect(onSubmitted).toHaveBeenCalled()
    })
  })

  it('allows submitting remaining fields without email', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()

    vi.mocked(lookupCep).mockResolvedValue({
      zip: '01001-000',
      address: 'Praça da Sé',
      city: 'São Paulo',
      state: 'SP',
    })
    vi.mocked(brokerApi.submitContractData).mockResolvedValue({
      status: 'contract_data_pending',
      attachments: [],
    })

    render(
      <BrokerContractDataDialog
        open
        onOpenChange={() => {}}
        reservationId={55}
        client={client}
        proposal={proposal}
        onSubmitted={onSubmitted}
      />,
    )

    await user.type(screen.getByLabelText('CPF *'), '52998224725')
    await user.type(screen.getByLabelText('RG *'), '123456789')
    await user.click(screen.getByRole('combobox', { name: 'Estado civil *' }))
    await user.click(await screen.findByRole('option', { name: 'Casado(a)' }))

    expect(screen.getByRole('tab', { name: 'Cônjuge' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Cônjuge' }))

    const spousePanel = await screen.findByRole('tabpanel', { name: 'Cônjuge' })
    await user.type(within(spousePanel).getByLabelText('Nome *'), 'Pedro Silva')
    await user.type(within(spousePanel).getByLabelText('Telefone'), '11988887777')
    expect(within(spousePanel).getByLabelText('Telefone')).toHaveValue('(11) 98888-7777')
    await user.type(within(spousePanel).getByLabelText('CPF *'), '11144477735')
    await user.type(within(spousePanel).getByLabelText('RG *'), '987654321')
    expect(within(spousePanel).getByLabelText('RG *')).toHaveValue('987654321')

    await user.click(screen.getByRole('tab', { name: 'Cliente' }))
    await user.type(screen.getByLabelText('CEP *'), '01001000')

    await waitFor(() => {
      expect(screen.getByLabelText('Endereço *')).toHaveValue('Praça da Sé')
    })

    const file = new File(['rg'], 'rg.pdf', { type: 'application/pdf' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file)

    await user.click(screen.getByRole('button', { name: 'Enviar dados do contrato' }))

    await waitFor(() => {
      expect(brokerApi.submitContractData).toHaveBeenCalledWith(
        55,
        expect.objectContaining({
          client_email: '',
          marital_status: 'Casado(a)',
          spouse_name: 'Pedro Silva',
          spouse_phone: '(11) 98888-7777',
          spouse_cpf: '11144477735',
          spouse_rg: '987654321',
          spouse_nationality: 'brasileira',
        }),
        [file],
      )
      expect(onSubmitted).toHaveBeenCalled()
    })
  })
})
