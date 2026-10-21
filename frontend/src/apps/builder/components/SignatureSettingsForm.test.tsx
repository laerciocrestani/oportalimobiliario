import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SignatureSettingsForm } from '@/apps/builder/components/SignatureSettingsForm'

const members = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bruno' },
  { id: 3, name: 'Carla' },
]

describe('SignatureSettingsForm', () => {
  it('submits two team witnesses and the selling broker slot', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <SignatureSettingsForm
        members={members}
        initialSignerId=""
        initialSlots={[
          { kind: 'team_user', userId: '' },
          { kind: 'team_user', userId: '' },
        ]}
        onSubmit={onSubmit}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Signatário da proposta'), '1')
    await user.selectOptions(screen.getByLabelText('Pessoa da vaga 1'), '2')
    await user.selectOptions(screen.getByLabelText('Pessoa da vaga 2'), '3')
    await user.click(screen.getByRole('button', { name: 'Adicionar vaga' }))
    await user.selectOptions(screen.getByLabelText('Tipo da vaga 3'), 'selling_broker')
    await user.click(screen.getByRole('button', { name: 'Salvar assinaturas' }))

    expect(onSubmit).toHaveBeenCalledWith({
      proposal_signer_user_id: 1,
      witness_slots: [
        { kind: 'team_user', user_id: 2 },
        { kind: 'team_user', user_id: 3 },
        { kind: 'selling_broker', user_id: null },
      ],
    })
  })
})
