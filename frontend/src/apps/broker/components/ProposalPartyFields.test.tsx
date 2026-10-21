import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProposalPartyFields } from '@/apps/broker/components/ProposalPartyFields'
import { emptyProposalPartyForm, type ProposalPartyForm } from '@/apps/broker/lib/proposal-party'

function Harness() {
  const [form, setForm] = useState<ProposalPartyForm>(emptyProposalPartyForm())

  return <ProposalPartyFields form={form} onChange={setForm} />
}

describe('ProposalPartyFields', () => {
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

    await user.click(screen.getByRole('radio', { name: 'Pessoa jurídica' }))
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
