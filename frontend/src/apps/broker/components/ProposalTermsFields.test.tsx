import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProposalTermsFields } from '@/apps/broker/components/ProposalTermsFields'

describe('ProposalTermsFields', () => {
  it('masks the reinforcement due date as dd/mm/yyyy and offers a calendar', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ProposalTermsFields
        body="{reforcos}"
        variables={[]}
        values={{}}
        onChange={onChange}
      />,
    )

    await user.type(screen.getByLabelText('Vencimento do reforço 1'), '10102026')

    expect(screen.getByLabelText('Vencimento do reforço 1')).toHaveValue('10/10/2026')
    expect(screen.getByRole('button', { name: 'Abrir calendário do vencimento 1' })).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith('reforco_1_vencimento', '10/10/2026')
  })
})
