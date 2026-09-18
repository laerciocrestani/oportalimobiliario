import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrokerClientsPage } from '@/apps/broker/BrokerClientsPage'

const { listClients, createClient } = vi.hoisted(() => ({
  listClients: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('@/apps/broker/components/BrokerDashboardShell', () => ({
  BrokerDashboardShell: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  brokerApi: {
    listClients,
    createClient,
  },
}))

describe('BrokerClientsPage', () => {
  beforeEach(() => {
    listClients.mockReset()
    createClient.mockReset()
    listClients.mockResolvedValue([])
  })

  it('masks the phone as brazilian mobile and shows the whatsapp icon', async () => {
    const user = userEvent.setup()

    render(<BrokerClientsPage />)

    const phoneInput = await screen.findByLabelText('Telefone *')

    expect(phoneInput.closest('[data-slot="input-group"]')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()

    await user.type(phoneInput, '11988887777')

    expect(phoneInput).toHaveValue('(11) 98888-7777')
  })

  it('creates a client with the masked phone', async () => {
    const user = userEvent.setup()

    createClient.mockResolvedValue({
      id: 1,
      name: 'Maria',
      phone: '(11) 98888-7777',
      email: null,
    })

    render(<BrokerClientsPage />)

    await screen.findByLabelText('Nome *')
    await user.type(screen.getByLabelText('Nome *'), 'Maria')
    await user.type(screen.getByLabelText('Telefone *'), '11988887777')
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }))

    await waitFor(() => {
      expect(createClient).toHaveBeenCalledWith({
        name: 'Maria',
        phone: '(11) 98888-7777',
        email: undefined,
      })
    })
  })
})
