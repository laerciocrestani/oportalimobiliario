import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import {
  ReservationAttachmentField,
  type ReservationFileItem,
} from '@/components/reservations/ReservationAttachmentField'

function FieldHarness({ multiple }: { multiple?: boolean }) {
  const [files, setFiles] = useState<ReservationFileItem[]>([])

  return (
    <ReservationAttachmentField
      files={files}
      onFilesChange={setFiles}
      multiple={multiple}
      emptyLabel="Anexar documentos"
    />
  )
}

describe('ReservationAttachmentField', () => {
  it('keeps multiple selected files visible in the list', async () => {
    const user = userEvent.setup()
    const rg = new File(['rg'], 'rg.pdf', { type: 'application/pdf' })
    const cpf = new File(['cpf'], 'cpf.pdf', { type: 'application/pdf' })

    render(<FieldHarness multiple />)

    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, [rg, cpf])

    expect(screen.getByText('rg.pdf')).toBeInTheDocument()
    expect(screen.getByText('cpf.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar outro arquivo' })).toBeInTheDocument()
  })

  it('appends another file without replacing the first', async () => {
    const user = userEvent.setup()
    const rg = new File(['rg'], 'rg.pdf', { type: 'application/pdf' })
    const cnh = new File(['cnh'], 'cnh.pdf', { type: 'application/pdf' })

    render(<FieldHarness multiple />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, rg)
    await user.upload(input, cnh)

    expect(screen.getByText('rg.pdf')).toBeInTheDocument()
    expect(screen.getByText('cnh.pdf')).toBeInTheDocument()
  })
})
