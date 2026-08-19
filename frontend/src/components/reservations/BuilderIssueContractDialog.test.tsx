import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuilderIssueContractDialog } from '@/components/reservations/BuilderIssueContractDialog'

const { listIssueContractTemplates, previewContractIssue, issueContract } = vi.hoisted(() => ({
  listIssueContractTemplates: vi.fn().mockResolvedValue([{ id: 3, name: 'Compra e venda padrão' }]),
  previewContractIssue: vi.fn().mockResolvedValue({
    template: { id: 3, name: 'Compra e venda padrão' },
    system_values: { nome_cliente: 'Maria Silva', preco_final: '450.000,00' },
    custom_variables: [{ slug: 'comissao_extra', label: 'Comissão extra' }],
    unknown_placeholders: [],
    required_custom_slugs: ['comissao_extra'],
    suggested_price: '450000',
  }),
  issueContract: vi.fn().mockResolvedValue({
    status: 'contract_issued',
    frozen_price_brl: '460000',
    attachment: { id: 9, kind: 'contract_pdf', original_name: 'contrato.pdf', file_url: '/file' },
  }),
}))

vi.mock('@/lib/api', () => ({
  builderApi: {
    listIssueContractTemplates,
    previewContractIssue,
    issueContract,
  },
}))

describe('BuilderIssueContractDialog', () => {
  it('loads preview and issues the contract', async () => {
    const user = userEvent.setup()
    const onIssued = vi.fn()

    render(
      <BuilderIssueContractDialog
        open
        onOpenChange={vi.fn()}
        reservationId={42}
        onIssued={onIssued}
      />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Valor final (R$)')).toHaveValue('450000')
      expect(screen.getByLabelText('Comissão extra')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Comissão extra'), 'R$ 5.000')
    await user.click(screen.getByRole('button', { name: 'Gerar PDF' }))

    await waitFor(() => {
      expect(issueContract).toHaveBeenCalledWith(42, {
        contract_template_id: 3,
        values: expect.objectContaining({
          nome_cliente: 'Maria Silva',
          comissao_extra: 'R$ 5.000',
        }),
        final_price_brl: 450000,
      })
      expect(onIssued).toHaveBeenCalled()
    })
  })
})
