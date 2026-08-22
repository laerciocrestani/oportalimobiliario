import { fetchAuthenticatedBlob, type ReservationAttachment } from '@/lib/api'

export function latestContractPdf(
  attachments: ReservationAttachment[],
): ReservationAttachment | null {
  return latestAttachmentByKind(attachments, 'contract_pdf')
}

export function latestAttachmentByKind(
  attachments: ReservationAttachment[],
  kind: string,
): ReservationAttachment | null {
  return attachments.filter((item) => item.kind === kind).at(-1) ?? null
}

export function blobForPreview(blob: Blob, mimeType: string): Blob {
  if (blob.type === mimeType) {
    return blob
  }

  return new Blob([blob], { type: mimeType })
}

export async function downloadReservationAttachment(
  attachment: ReservationAttachment,
): Promise<void> {
  const blob = await fetchAuthenticatedBlob(attachment.file_url)
  const url = URL.createObjectURL(blobForPreview(blob, attachment.mime_type))
  const link = document.createElement('a')

  link.href = url
  link.download = attachment.original_name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
