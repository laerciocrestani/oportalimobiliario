import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrokerNewClientDialog } from '@/apps/broker/components/BrokerNewClientDialog'

vi.mock('@/lib/api', () => ({
  brokerApi: {
    createClient: vi.fn(),
  },
}))

import { brokerApi } from '@/lib/api'

describe('BrokerNewClientDialog', () => {
  it('requires name and phone before submitting', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()

    render(
      <BrokerNewClientDialog open onOpenChange={() => {}} onCreated={onCreated} />,
    )

    await user.click(screen.getByRole('button', { name: 'Salvar cliente' }))

    expect(brokerApi.createClient).not.toHaveBeenCalled()
  })

  it('creates client and notifies parent', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()

    vi.mocked(brokerApi.createClient).mockResolvedValue({
      id: 1,
      name: 'Maria',
      phone: '(11) 98888-7777',
      email: null,
    })

    render(
      <BrokerNewClientDialog open onOpenChange={() => {}} onCreated={onCreated} />,
    )

    await user.type(screen.getByLabelText('Nome *'), 'Maria')
    await user.type(screen.getByLabelText('Telefone *'), '(11) 98888-7777')
    await user.click(screen.getByRole('button', { name: 'Salvar cliente' }))

    expect(brokerApi.createClient).toHaveBeenCalledWith({
      name: 'Maria',
      phone: '(11) 98888-7777',
      email: undefined,
    })
    expect(onCreated).toHaveBeenCalledWith({
      id: 1,
      name: 'Maria',
      phone: '(11) 98888-7777',
      email: null,
    })
  })
})
