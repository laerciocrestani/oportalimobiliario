import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReservationCancelDialog } from '@/components/reservations/ReservationCancelDialog'

describe('ReservationCancelDialog', () => {
  it('keeps confirm disabled until a reason is filled and has no footer cancel button', () => {
    render(
      <ReservationCancelDialog
        open
        onOpenChange={() => {}}
        clientName="Ana Silva"
        onConfirm={async () => {}}
      />,
    )

    expect(screen.getByText(/A reserva de Ana Silva será cancelada/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar reserva' })).toBeDisabled()
  })

  it('submits the typed reason', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()

    render(
      <ReservationCancelDialog
        open
        onOpenChange={onOpenChange}
        clientName="Ana Silva"
        onConfirm={onConfirm}
      />,
    )

    await user.type(screen.getByLabelText('Motivo *'), '  Cliente desistiu.  ')
    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('Cliente desistiu.')
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
