import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProposalSignatureProcess } from '@/components/reservations/ProposalSignatureProcess'
import { signaturePartyState } from '@/components/reservations/signature-process'
import type { SignatureProcessParty } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  ApiRequestError: class ApiRequestError extends Error {},
  builderApi: {
    resendProposalSignatureLinks: vi.fn().mockResolvedValue({ notified: 1 }),
    resendContractSignatureLinks: vi.fn(),
  },
  brokerApi: {
    resendProposalSignatureLinks: vi.fn(),
    resendContractSignatureLinks: vi.fn(),
  },
}))

const parties: SignatureProcessParty[] = [
  { role: 'builder', label: 'Gestor da construtora', name: 'Helena Vargas', status: 'pending' },
  { role: 'broker', label: 'Corretor', name: 'João Corretor', status: 'pending' },
  { role: 'buyer', label: 'Cliente', name: 'Laércio Crestani', status: 'pending' },
]

describe('signaturePartyState', () => {
  it('keeps the signature with the builder until they sign', () => {
    expect(signaturePartyState(parties, 'builder')).toBe('processing')
    expect(signaturePartyState(parties, 'broker')).toBe('waiting')
    expect(signaturePartyState(parties, 'buyer')).toBe('waiting')
  })

  it('moves the signature to the broker and then to the client', () => {
    const afterBuilder = parties.map((party) => (
      party.role === 'builder' ? { ...party, status: 'signed' as const } : party
    ))

    expect(signaturePartyState(afterBuilder, 'builder')).toBe('done')
    expect(signaturePartyState(afterBuilder, 'broker')).toBe('processing')
    expect(signaturePartyState(afterBuilder, 'buyer')).toBe('waiting')

    const afterBroker = afterBuilder.map((party) => (
      party.role === 'broker' ? { ...party, status: 'signed' as const } : party
    ))

    expect(signaturePartyState(afterBroker, 'broker')).toBe('done')
    expect(signaturePartyState(afterBroker, 'buyer')).toBe('processing')
  })
})

describe('ProposalSignatureProcess', () => {
  it('shows the 24 hour deadline on the party who has the signature', () => {
    render(
      <ProposalSignatureProcess
        process={{
          sent_at: '2026-10-23T22:43:00-03:00',
          due_at: '2099-10-24T22:43:00-03:00',
          parties,
        }}
      />,
    )

    expect(screen.getByText('Aguardando assinatura Gestor')).toBeInTheDocument()
    expect(screen.getByText('Helena Vargas | 23/10/2026 às 22:43')).toBeInTheDocument()
    expect(screen.getByText('Aguardando assinatura Corretor')).toBeInTheDocument()
    expect(screen.getByText('Aguardando assinatura Comprador')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Notificar' })).not.toBeInTheDocument()
  })

  it('shows a notify action on every person still waiting and a green check after they sign', () => {
    render(
      <ProposalSignatureProcess
        process={{
          sent_at: '2026-10-23T22:43:00-03:00',
          due_at: '2099-10-24T22:43:00-03:00',
          parties: parties.map((party) => (
            party.role === 'builder'
              ? { ...party, status: 'signed' as const, signed_at: '2026-10-24T13:20:00-03:00' }
              : party
          )),
        }}
        resend={{ profile: 'builder', reservationId: 16 }}
      />,
    )

    expect(screen.getByText('Proposta assinada dia 24/10/2026 às 13:20')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Notificar' })).toHaveLength(2)
  })

  it('embeds both witnesses in the contract signature timeline', () => {
    render(
      <ProposalSignatureProcess
        document="contract"
        process={{
          sent_at: '2026-10-24T09:59:00-03:00',
          due_at: '2099-10-25T09:59:00-03:00',
          parties: [
            { key: 'buyer', role: 'buyer', label: 'Comprador', name: 'Laércio Crestani', status: 'signed', signed_at: '2026-10-24T10:10:00-03:00' },
            { key: 'builder', role: 'builder', label: 'Gestor', name: 'Helena Vargas', status: 'pending' },
            { key: 'witness-1', role: 'witness', label: 'Testemunha 1', name: 'João Corretor', status: 'pending' },
            { key: 'witness-2', role: 'witness', label: 'Testemunha 2', name: 'Paula Testemunha', status: 'pending' },
          ],
        }}
      />,
    )

    expect(screen.getByText('Contrato assinado dia 24/10/2026 às 10:10')).toBeInTheDocument()
    expect(screen.getByText('Aguardando assinatura Gestor')).toBeInTheDocument()
    expect(screen.getByText('Aguardando assinatura Testemunha 1')).toBeInTheDocument()
    expect(screen.getByText('Aguardando assinatura Testemunha 2')).toBeInTheDocument()
    expect(screen.getByText('João Corretor | 24/10/2026 às 09:59')).toBeInTheDocument()
    expect(screen.getByText('Paula Testemunha | 24/10/2026 às 09:59')).toBeInTheDocument()
  })
})
