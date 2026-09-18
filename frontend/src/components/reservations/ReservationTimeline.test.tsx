import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReservationTimeline } from '@/components/reservations/ReservationTimeline'
import type { ReservationTimeline as ReservationTimelineData } from '@/lib/api'

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
  it('renders only the current step and keeps files visible', () => {
    const onAction = vi.fn()

    render(<ReservationTimeline timeline={sampleTimeline} onAction={onAction} />)

    expect(screen.queryByText('Diálogo com construtora')).not.toBeInTheDocument()
    expect(screen.queryByText('Pré-reserva')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir diálogo' })).not.toBeInTheDocument()
    expect(screen.getByText('Arquivos da reserva')).toBeInTheDocument()
    expect(screen.getByText('Nenhum arquivo enviado ainda')).toBeInTheDocument()
    expect(screen.getByText('101')).toBeInTheDocument()
    expect(document.querySelector('.animate-ping')).not.toBeInTheDocument()
  })

  it('lists historic attachments after the process moves forward', () => {
    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'contract_data_pending',
          attachments: [
            {
              id: 9,
              kind: 'deposit_proof',
              original_name: 'pix.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              uploaded_by: 2,
              created_at: '2026-07-10T19:30:00+00:00',
              file_url: '/builder/reservations/1/attachments/9/file',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Arquivos da reserva')).toBeInTheDocument()
    expect(screen.getByText('Comprovante de pagamento')).toBeInTheDocument()
    expect(screen.getByText('pix.pdf')).toBeInTheDocument()
  })

  it('lists proposal attachments in the historic group', () => {
    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'proposal_pending',
          attachments: [
            {
              id: 4,
              kind: 'proposal',
              original_name: 'simulacao.pdf',
              mime_type: 'application/pdf',
              size_bytes: 1024,
              uploaded_by: 2,
              created_at: '2026-07-10T19:10:00+00:00',
              file_url: '/builder/reservations/1/attachments/4/file',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Anexos da proposta')).toBeInTheDocument()
    expect(screen.getByText('simulacao.pdf')).toBeInTheDocument()
  })

  it('renders contract data action for the current step', () => {
    const onAction = vi.fn()

    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          current_stage: 'contract_data_pending',
          client: { id: 2, name: 'Ana Silva', phone: '11999999999', email: null },
          steps: [
            {
              key: 'contract_data',
              label: 'Dados para contrato',
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

    expect(screen.getByText('Dados para contrato')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar dados do contrato' })).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeInTheDocument()
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
