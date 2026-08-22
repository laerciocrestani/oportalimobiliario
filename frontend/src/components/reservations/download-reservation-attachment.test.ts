import { fetchAuthenticatedBlob, type ReservationAttachment } from '@/lib/api'
import { describe, expect, it, vi } from 'vitest'
import {
  blobForPreview,
  downloadReservationAttachment,
  latestContractPdf,
} from '@/components/reservations/download-reservation-attachment'

vi.mock('@/lib/api', () => ({
  fetchAuthenticatedBlob: vi.fn(),
}))

const pdf: ReservationAttachment = {
  id: 11,
  kind: 'contract_pdf',
  original_name: 'contrato.pdf',
  mime_type: 'application/pdf',
  size_bytes: 4096,
  uploaded_by: 1,
  created_at: '2026-08-19T12:00:00+00:00',
  file_url: '/broker/reservations/1/attachments/11/file',
}

describe('latestContractPdf', () => {
  it('returns the most recent issued contract PDF', () => {
    expect(
      latestContractPdf([
        { ...pdf, id: 10, original_name: 'antigo.pdf' },
        pdf,
      ]),
    ).toEqual(pdf)
  })

  it('returns null when there is no contract PDF', () => {
    expect(
      latestContractPdf([
        { ...pdf, kind: 'deposit_proof', original_name: 'pix.pdf' },
      ]),
    ).toBeNull()
  })
})

describe('downloadReservationAttachment', () => {
  it('downloads the authenticated blob with the original filename', async () => {
    vi.mocked(fetchAuthenticatedBlob).mockResolvedValue(
      new Blob(['%PDF'], { type: 'application/pdf' }),
    )

    const createObjectURL = vi.fn(() => 'blob:contrato')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await downloadReservationAttachment(pdf)

    expect(fetchAuthenticatedBlob).toHaveBeenCalledWith(pdf.file_url)
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:contrato')
  })
})

describe('blobForPreview', () => {
  it('forces the mime type when the blob has an empty type', () => {
    const blob = new Blob(['%PDF'])
    const preview = blobForPreview(blob, 'application/pdf')

    expect(preview.type).toBe('application/pdf')
  })
})
