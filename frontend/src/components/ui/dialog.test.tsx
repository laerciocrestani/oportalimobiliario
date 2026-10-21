import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

describe('Dialog', () => {
  it('enables vertical scroll when content exceeds the dialog height', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Título</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>Conteúdo longo</p>
          </DialogBody>
          <DialogFooter>
            <button type="button">Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog')
    const footer = dialog.querySelector('[data-slot="dialog-footer"]')

    expect(dialog).toHaveClass('max-h-[90vh]', 'overflow-y-auto')
    expect(dialog.querySelector('[data-slot="dialog-body"]')).toHaveClass('overflow-y-auto')
    expect(footer).toHaveClass('border-t', 'bg-muted/50', 'rounded-b-xl')
  })
})
