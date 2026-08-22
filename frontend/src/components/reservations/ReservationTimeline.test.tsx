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
  it('renders steps and current action button', () => {
    const onAction = vi.fn()

    render(<ReservationTimeline timeline={sampleTimeline} onAction={onAction} />)

    expect(screen.getByText('Pré-reserva')).toBeInTheDocument()
    expect(screen.getByText(/ · João/)).toBeInTheDocument()
    expect(screen.getByText('Diálogo com construtora')).toBeInTheDocument()
    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument()
    expect(screen.queryByText('Concluído')).not.toBeInTheDocument()
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir diálogo' })).toBeInTheDocument()
    expect(document.querySelector('ol span[aria-hidden]')).toHaveClass('bg-emerald-50')
    expect(document.querySelector('.animate-ping')).toBeInTheDocument()
    expect(screen.getByText('Diálogo com construtora').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    )
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

    expect(screen.getByText('Anexos da reserva')).toBeInTheDocument()
    expect(screen.getByText('Comprovante de pagamento')).toBeInTheDocument()
    expect(screen.getByText('pix.pdf')).toBeInTheDocument()
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

  it('renders upcoming steps with a disabled gray tone', () => {
    render(
      <ReservationTimeline
        timeline={{
          ...sampleTimeline,
          steps: [
            ...sampleTimeline.steps,
            {
              key: 'proposal_submitted',
              label: 'Proposta enviada',
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

    const label = screen.getByText('Proposta enviada')
    expect(label).toHaveClass('text-muted-foreground')
    expect(label.closest('li')?.querySelector('.rounded-full')).toHaveClass(
      'bg-muted',
      'text-muted-foreground',
    )
  })
})
