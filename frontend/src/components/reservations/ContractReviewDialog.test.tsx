import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ContractReviewDialog } from '@/components/reservations/ContractReviewDialog'

const { getContractReview, updateContractReview, acceptContractReview } = vi.hoisted(() => ({
  getContractReview: vi.fn(),
  updateContractReview: vi.fn(),
  acceptContractReview: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  builderApi: {
    getContractReview,
    updateContractReview,
    acceptContractReview,
  },
}))

describe('ContractReviewDialog', () => {
  it('lets the manager edit the filled text and accept it', async () => {
    const user = userEvent.setup()
    getContractReview.mockResolvedValue({
      templates: [{ id: 3, name: 'Compra e venda padrão' }],
      template_id: 3,
      body: 'Cliente Laércio Crestani na unidade 501.',
      html: '<p>Cliente Laércio Crestani na unidade 501.</p>',
    })
    updateContractReview.mockResolvedValue({
      templates: [{ id: 3, name: 'Compra e venda padrão' }],
      template_id: 3,
      body: 'Texto editado.',
      html: '<p>Texto editado.</p>',
    })
    acceptContractReview.mockResolvedValue({ status: 'contract_issued' })
    const onAccepted = vi.fn()

    render(
      <ContractReviewDialog
        open
        onOpenChange={() => {}}
        reservationId={16}
        onAccepted={onAccepted}
      />,
    )

    expect(await screen.findByText(/Laércio Crestani/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Modelo do contrato' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const editor = screen.getByRole('textbox', { name: 'Texto do contrato' })
    await user.clear(editor)
    await user.type(editor, 'Texto editado.')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(updateContractReview).toHaveBeenCalledWith(16, { body: 'Texto editado.' })
    expect(await screen.findByText('Texto editado.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Aceitar' }))

    expect(acceptContractReview).toHaveBeenCalledWith(16)
    expect(onAccepted).toHaveBeenCalled()
  })
})
