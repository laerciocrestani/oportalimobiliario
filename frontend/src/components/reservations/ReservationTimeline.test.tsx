import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReservationTimeline } from '@/components/reservations/ReservationTimeline'
import type { ReservationTimeline as ReservationTimelineData } from '@/lib/api'
import { formatListedPrice } from '@/lib/unit-listing'

const sampleTimeline: ReservationTimelineData = {
  reservation_id: 1,
  current_stage: 'pre_hold',
  expires_at: '2026-07-10T20:00:00+00:00',
  unit: { id: 10, code: '101', status: 'pre_reserved' },
  deposit_overdue: false,
  client: null,
  current_proposal: null,
  current_deposit_proof: null,
  current_signed_contract: null,
  current_builder_signed_contract: null,
  witnesses: [],
  attachments: [],
  steps: [
    {
      key: 'pre_hold_created',
      label: 'Pré-reserva',
      status: 'completed',
      occurred_at: '2026-07-10T19:00:00+00:00',
      due_at: null,
      actor: { id: 2, name: 'João', role: 'broker' },
      actions: [],
    },
    {
      key: 'dialogue',
      label: 'Diálogo com construtora',
      status: 'current',
      occurred_at: null,
      due_at: '2026-07-10T20:00:00+00:00',
      actor: null,
      actions: ['open_dialogue'],
    },
  ],
}

describe('ReservationTimeline', () => {
  it('renders only the current step', () => {
    const onAction = vi.fn()

    render(<ReservationTimeline timeline={sampleTimeline} onAction={onAction} />)

    expect(screen.queryByText('Diálogo com construtora')).not.toBeInTheDocument()
    expect(screen.queryByText('Pré-reserva')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir diálogo' })).not.toBeInTheDocument()
    expect(screen.queryByText('Arquivos da reserva')).not.toBeInTheDocument()
    expect(screen.getByText('101')).toBeInTheDocument()
    expect(document.querySelector('.animate-ping')).not.toBeInTheDocument()
  })

  it('compacts proposal review info', async () => {
    const user = userEvent.setup()

    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'proposal_pending',
          client: { id: 2, name: 'Ana Silva', phone: '11999999999', email: null },
          current_proposal: {
            id: 1,
            version: 2,
            client_name: 'Ana Silva',
            client_phone: '11999999999',
            client_cpf: '52998224725',
            payment_terms: 'Entrada de R$ 50.000 + 24x de R$ 5.000',
            commercial_terms: {
              description: 'Entrada de R$ 50.000 + 24x de R$ 5.000',
              reinforcements: [
                { amount: '10000.00', due_on: '2026-11-10' },
                { amount: '5000.00', due_on: null },
              ],
              dations: ['Apartamento na rua A'],
            },
            decision: null,
            decision_note: null,
            submitted_by: 2,
            decided_by: null,
            decided_at: null,
            created_at: '2026-08-22T11:00:00.000Z',
            client_email: '',
            marital_status: '',
            nationality: 'brasileira',
            profession: 'Administrador',
            address: 'Travessa Natal',
            city: 'Lajeado',
            state: 'RS',
            zip: '95700500',
            land_value: 0,
          },
          steps: [
            {
              key: 'proposal_decision',
              label: 'Decisão do gestor',
              status: 'current',
              occurred_at: null,
              due_at: null,
              actor: null,
              actions: [],
            },
          ],
        }}
      />,
    )

    const listed = (value: string) => (text: string) => text.replace(/\s/g, ' ') === formatListedPrice(value).replace(/\s/g, ' ')
    const whatsApp = screen.getByRole('link', { name: 'Conversar no WhatsApp com Ana Silva' })

    expect(screen.queryByText('101')).not.toBeInTheDocument()
    expect(screen.queryByText(/Proposta v2/)).not.toBeInTheDocument()
    expect(screen.getByText('Descrição')).toBeInTheDocument()
    expect(screen.getByText('Entrada de R$ 50.000 + 24x de R$ 5.000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ana Silva' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ana Silva' }))

    const details = await screen.findByRole('dialog', { name: 'Dados do cliente' })

    expect(within(details).getByText('Administrador')).toBeInTheDocument()
    expect(within(details).getByText('Travessa Natal')).toBeInTheDocument()
    expect(within(details).getByText('95700-500')).toBeInTheDocument()
    expect(within(details).getByText('Lajeado')).toBeInTheDocument()
    expect(within(details).getByText('brasileira')).toBeInTheDocument()
    expect(whatsApp).toHaveAttribute('href', 'https://wa.me/5511999999999')
    expect(whatsApp).toHaveTextContent('(11) 99999-9999')
    expect(screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === '529.982.247-25')).toBeInTheDocument()
    expect(screen.getByText('Reforços')).toBeInTheDocument()
    expect(screen.getByText((text) => text.replace(/\s/g, ' ').includes(formatListedPrice('10000.00').replace(/\s/g, ' ')) && text.includes('10/11/2026'))).toBeInTheDocument()
    expect(screen.getByText(listed('5000.00'))).toBeInTheDocument()
    expect(screen.getByText('Dação')).toBeInTheDocument()
    expect(screen.getByText('Apartamento na rua A')).toBeInTheDocument()
    expect(screen.queryByText('Decisão do gestor')).not.toBeInTheDocument()
    expect(screen.queryByText('Arquivos da reserva')).not.toBeInTheDocument()
  })

  it('does not offer contract data collection on the contract column', () => {
    const onAction = vi.fn()

    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'contract_data_pending',
          client: { id: 2, name: 'Ana Silva', phone: '11999999999', email: null },
          steps: [
            {
              key: 'contract_issue',
              label: 'Emissão do contrato',
              status: 'current',
              occurred_at: null,
              due_at: null,
              actor: null,
              actions: ['submit_contract_data'],
            },
          ],
        }}
        onAction={onAction}
      />,
    )

    expect(screen.getByText('Emissão do contrato')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar dados do contrato' })).not.toBeInTheDocument()
  })

  it('shows the contract signature process instead of the issue step', () => {
    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'contract_signing',
          expires_at: null,
          client: { id: 2, name: 'Laércio Crestani', phone: '11999999999', email: null },
          signature_process: {
            sent_at: '2026-10-24T09:59:00-03:00',
            due_at: '2026-10-25T09:59:00-03:00',
            parties: [
              { key: 'buyer', role: 'buyer', label: 'Comprador', name: 'Laércio Crestani', status: 'pending' },
              { key: 'builder', role: 'builder', label: 'Gestor', name: 'Helena Vargas', status: 'pending' },
              { key: 'witness-1', role: 'witness', label: 'Testemunha 1', name: 'João Corretor', status: 'pending' },
              { key: 'witness-2', role: 'witness', label: 'Testemunha 2', name: 'Paula Testemunha', status: 'pending' },
            ],
          },
          steps: [
            {
              key: 'contract_issue',
              label: 'Emissão do contrato',
              status: 'current',
              occurred_at: '2026-10-24T09:59:00-03:00',
              due_at: null,
              actor: { id: 1, name: 'Construtora Alpha', role: 'builder' },
              actions: [],
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Aguardando assinatura Comprador')).toBeInTheDocument()
    expect(screen.getByText('Aguardando assinatura Testemunha 1')).toBeInTheDocument()
    expect(screen.getByText('Aguardando assinatura Testemunha 2')).toBeInTheDocument()
    expect(screen.queryByText('Emissão do contrato')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Baixar PDF' })).not.toBeInTheDocument()
    expect(screen.queryByText('Cliente:')).not.toBeInTheDocument()
  })

  it('shows the issued contract PDF and download on the GOV signature step', () => {
    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'contract_issued',
          attachments: [
            {
              id: 11,
              kind: 'contract_pdf',
              original_name: 'contrato.pdf',
              mime_type: 'application/pdf',
              size_bytes: 4096,
              uploaded_by: 1,
              created_at: '2026-08-19T12:00:00+00:00',
              file_url: '/broker/reservations/1/attachments/11/file',
            },
          ],
          steps: [
            {
              key: 'contract_sign_gov',
              label: 'Assinatura GOV',
              status: 'current',
              occurred_at: null,
              due_at: null,
              actor: null,
              actions: ['mark_signed_gov'],
            },
          ],
        }}
      />,
    )

    expect(screen.getAllByText('contrato.pdf').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Baixar contrato.pdf' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Registrar assinatura GOV' })).toBeInTheDocument()
  })

  it('shows the buyer-signed PDF on the builder signature step', () => {
    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'contract_uploaded',
          attachments: [
            {
              id: 12,
              kind: 'contract_signed',
              original_name: 'contrato-comprador.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              uploaded_by: 2,
              created_at: '2026-08-21T12:00:00+00:00',
              file_url: '/builder/reservations/1/attachments/12/file',
            },
          ],
          steps: [
            {
              key: 'contract_builder_sign',
              label: 'Contrato assinado pela construtora',
              status: 'current',
              occurred_at: null,
              due_at: null,
              actor: null,
              actions: ['upload_builder_signed_contract'],
            },
          ],
        }}
      />,
    )

    expect(screen.getAllByText('contrato-comprador.pdf').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enviar contrato assinado pela construtora' }),
    ).toBeInTheDocument()
  })

  it('shows the witness signature action on the current witness step', () => {
    const onAction = vi.fn()

    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'contract_builder_signed',
          steps: [
            {
              key: 'contract_witness_1',
              label: 'Assinatura da testemunha 1',
              status: 'current',
              occurred_at: null,
              due_at: null,
              actor: null,
              actions: ['sign_as_witness'],
            },
          ],
        }}
        onAction={onAction}
      />,
    )

    expect(screen.getByText('Assinatura da testemunha 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar assinatura da testemunha' })).toBeInTheDocument()
  })

  it('labels issue_contract as Reemitir when a PDF already exists', () => {
    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'contract_data_pending',
          attachments: [
            {
              id: 11,
              kind: 'contract_pdf',
              original_name: 'contrato.pdf',
              mime_type: 'application/pdf',
              size_bytes: 4096,
              uploaded_by: 1,
              created_at: '2026-08-19T12:00:00+00:00',
              file_url: '/builder/reservations/1/attachments/11/file',
            },
          ],
          steps: [
            {
              key: 'contract_sign_gov',
              label: 'Assinatura',
              status: 'current',
              occurred_at: null,
              due_at: null,
              actor: null,
              actions: ['issue_contract'],
            },
          ],
        }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Reemitir contrato' })).toBeInTheDocument()
  })

  it('does not render upcoming steps from other columns', () => {
    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          steps: [
            ...sampleTimeline.steps,
            {
              key: 'proposal_submitted',
              label: 'Proposta',
              status: 'upcoming',
              occurred_at: null,
              due_at: null,
              actor: null,
              actions: [],
            },
            {
              key: 'deposit_window',
              label: 'Aguardando sinal (48h)',
              status: 'upcoming',
              occurred_at: null,
              due_at: null,
              actor: null,
              actions: [],
            },
          ],
        }}
      />,
    )

    expect(screen.queryByText('Proposta')).not.toBeInTheDocument()
    expect(screen.queryByText('Aguardando sinal (48h)')).not.toBeInTheDocument()
    expect(screen.queryByText('Diálogo com construtora')).not.toBeInTheDocument()
  })

  it('shows only the deposit notice while waiting for the proof', () => {
    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'deposit_pending',
          client: { id: 4, name: 'Laércio Crestani', phone: '54998494949', email: null },
          steps: [
            {
              key: 'deposit_window',
              label: 'Aguardando sinal (48h)',
              status: 'current',
              occurred_at: '2026-10-24T12:40:00.000Z',
              due_at: null,
              actor: null,
              actions: ['submit_deposit_proof'],
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Aguardando o comprovante do sinal.')).toBeInTheDocument()
    expect(screen.queryByText('Aguardando sinal (48h)')).not.toBeInTheDocument()
    expect(screen.queryByText('Unidade:')).not.toBeInTheDocument()
    expect(screen.queryByText('Laércio Crestani')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anexar comprovante' })).toBeInTheDocument()
  })

  it('labels hold actions for the builder on a current pre-reservation', () => {
    const onAction = vi.fn()

    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          client: { id: 3, name: 'Maria', phone: '11999999999', email: null },
          steps: [
            sampleTimeline.steps[0],
            {
              ...sampleTimeline.steps[1],
              actions: ['open_dialogue', 'extend_hold', 'drop_hold'],
            },
          ],
        }}
        onAction={onAction}
      />,
    )

    expect(screen.getByRole('button', { name: 'Estender prazo (+48h)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Encerrar pré-reserva' })).toBeInTheDocument()
  })
})
