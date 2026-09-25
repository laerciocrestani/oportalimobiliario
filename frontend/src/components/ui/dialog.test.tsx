import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  Dialog,
  DialogBody,
  DialogContent,
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
        </DialogContent>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveClass('max-h-[90vh]', 'overflow-y-auto')
    expect(dialog.querySelector('[data-slot="dialog-body"]')).toHaveClass('overflow-y-auto')
  })
})
