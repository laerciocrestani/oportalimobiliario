import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProposalPartyFields } from '@/apps/broker/components/ProposalPartyFields'
import { emptyProposalPartyForm, type ProposalPartyForm } from '@/apps/broker/lib/proposal-party'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    lookupBuyer: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('@/lib/viacep', async () => {
  const actual = await vi.importActual<typeof import('@/lib/viacep')>('@/lib/viacep')

  return {
    ...actual,
    lookupCep: vi.fn().mockResolvedValue(null),
  }
})

import { brokerApi, type BrokerBuyer } from '@/lib/api'
import { lookupCep } from '@/lib/viacep'

function Harness() {
  const [form, setForm] = useState<ProposalPartyForm>(emptyProposalPartyForm())
  const [contact, setContact] = useState({ name: 'Ana Silva', phone: '', email: '' })

  return (
    <ProposalPartyFields
      form={form}
      contact={contact}
      onChange={setForm}
      onContactChange={setContact}
    />
  )
}

const existingBuyer: BrokerBuyer = {
  party_kind: 'individual',
  client_name: 'Maria Silva',
  client_phone: '11988887777',
  client_email: 'maria@example.com',
  client_cpf: '52998224725',
  client_rg: '1234567',
  address: 'Rua A, 10',
  city: 'São Paulo',
  state: 'SP',
  zip: '01001000',
  marital_status: 'Casado(a)',
  nationality: 'brasileira',
  profession: 'Arquiteta',
  spouse_name: 'João Silva',
  spouse_cpf: '39053344705',
}

describe('ProposalPartyFields', () => {
  beforeEach(() => {
    vi.mocked(brokerApi.lookupBuyer).mockReset()
    vi.mocked(brokerApi.lookupBuyer).mockResolvedValue(null)
  })

  it('puts the document before the name', () => {
    render(<Harness />)

    const document = screen.getByLabelText('CPF')
    const name = screen.getByLabelText('Nome')

    expect(screen.getByText('CPF *')).toBeInTheDocument()
    expect(screen.getByText('Nome *')).toBeInTheDocument()
    expect(screen.getByText('Telefone *')).toBeInTheDocument()
    expect(screen.getByText('E-mail')).toBeInTheDocument()
    expect(screen.queryByText('E-mail *')).not.toBeInTheDocument()
    expect(document.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('fills the buyer when the document already exists', async () => {
    const user = userEvent.setup()
    vi.mocked(brokerApi.lookupBuyer).mockResolvedValue(existingBuyer)
    render(<Harness />)

    await user.type(screen.getByLabelText('CPF'), '52998224725')

    expect(await screen.findByDisplayValue('Maria Silva')).toBeInTheDocument()
    expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 98888-7777')
    expect(screen.getByLabelText('E-mail')).toHaveValue('maria@example.com')
    expect(screen.getByLabelText('RG')).toHaveValue('1234567')
    expect(screen.getByLabelText('Profissão')).toHaveValue('Arquiteta')
    expect(screen.getByLabelText('CEP')).toHaveValue('01001-000')
    expect(screen.getByLabelText('Endereço')).toHaveValue('Rua A, 10')
    expect(screen.getByLabelText('Nome do cônjuge')).toHaveValue('João Silva')
    expect(screen.getByText('Nome do cônjuge *')).toBeInTheDocument()
    expect(screen.getByText('CPF do cônjuge *')).toBeInTheDocument()
    expect(screen.getByText('Cadastro encontrado. Os dados foram preenchidos.')).toBeInTheDocument()
  })

  it('shows a loading icon inside the document and the zip fields while searching', async () => {
    const user = userEvent.setup()
    let resolveBuyer: (buyer: BrokerBuyer | null) => void = () => {}
    let resolveCep: (address: null) => void = () => {}
    vi.mocked(brokerApi.lookupBuyer).mockReturnValue(new Promise((resolve) => {
      resolveBuyer = resolve
    }))
    vi.mocked(lookupCep).mockReturnValue(new Promise((resolve) => {
      resolveCep = resolve
    }))
    render(<Harness />)

    await user.type(screen.getByLabelText('CPF'), '52998224725')
    expect(screen.getByRole('status', { name: 'Buscando CPF' })).toBeInTheDocument()

    resolveBuyer(null)
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Buscando CPF' })).not.toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('CEP'), '01001000')
    expect(screen.getByRole('status', { name: 'Buscando CEP' })).toBeInTheDocument()

    resolveCep(null)
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Buscando CEP' })).not.toBeInTheDocument()
    })
  })

  it('masks and validates CPF, and switches the same field to CNPJ', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const document = screen.getByLabelText('CPF')
    await user.type(document, '52998224725')
    expect(document).toHaveValue('529.982.247-25')
    expect(screen.queryByText('CPF inválido.')).not.toBeInTheDocument()

    await user.clear(document)
    await user.type(document, '11111111111')
    expect(document).toHaveValue('111.111.111-11')
    expect(screen.getByText('CPF inválido.')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Pessoa jurídica (PJ)' }))
    expect(screen.getByLabelText('Razão social')).toBeEnabled()
    expect(screen.queryByLabelText('RG')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Estado civil')).not.toBeInTheDocument()
    const cnpj = screen.getByLabelText('CNPJ')
    expect(cnpj).toHaveValue('')
    expect(screen.queryByText('CPF inválido.')).not.toBeInTheDocument()

    await user.type(cnpj, '11222333000180')
    expect(cnpj).toHaveValue('11.222.333/0001-80')
    expect(screen.getByText('CNPJ inválido.')).toBeInTheDocument()

    await user.clear(cnpj)
    await user.type(cnpj, '11444777000161')
    expect(cnpj).toHaveValue('11.444.777/0001-61')
    expect(screen.queryByText('CNPJ inválido.')).not.toBeInTheDocument()
  })
})
