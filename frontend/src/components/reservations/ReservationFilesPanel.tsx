import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  ReservationAttachmentField,
  type ReservationFileItem,
} from '@/components/reservations/ReservationAttachmentField'
import { ReservationAttachmentPreview } from '@/components/reservations/ReservationAttachmentPreview'
import type { ReservationAttachment } from '@/lib/api'
import { cn } from '@/lib/utils'

const ATTACHMENT_KIND_LABELS: Record<string, string> = {
  proposal: 'Anexos da proposta',
  proposal_pdf: 'Proposta gerada',
  proposal_signed_builder: 'Proposta assinada pela construtora',
  proposal_signed_both: 'Proposta assinada por ambas as partes',
  deposit_proof: 'Comprovante de pagamento',
  contract_documentation: 'Documentação do cliente',
  contract_pdf: 'Contrato',
  contract_signed: 'Contrato assinado pelo comprador',
  contract_signed_builder: 'Contrato assinado pela construtora',
}

const ATTACHMENT_KIND_ORDER = [
  'proposal',
  'proposal_pdf',
  'proposal_signed_builder',
  'proposal_signed_both',
  'deposit_proof',
  'contract_documentation',
  'contract_pdf',
  'contract_signed',
  'contract_signed_builder',
] as const

function groupedAttachments(attachments: ReservationAttachment[]): Array<{
  kind: string
  label: string
  items: ReservationAttachment[]
}> {
  const byKind = new Map<string, ReservationAttachment[]>()

  for (const attachment of attachments) {
    const items = byKind.get(attachment.kind) ?? []
    items.push(attachment)
    byKind.set(attachment.kind, items)
  }

  const orderedKinds = [
    ...ATTACHMENT_KIND_ORDER.filter((kind) => byKind.has(kind)),
    ...[...byKind.keys()].filter((kind) => !ATTACHMENT_KIND_ORDER.includes(kind as (typeof ATTACHMENT_KIND_ORDER)[number])),
  ]

  return orderedKinds.map((kind) => ({
    kind,
    label: ATTACHMENT_KIND_LABELS[kind] ?? kind,
    items: byKind.get(kind) ?? [],
  }))
}

type ReservationFilesPanelProps = {
  attachments?: ReservationAttachment[]
  files?: ReservationFileItem[]
  onFilesChange?: (files: ReservationFileItem[]) => void
  uploadDisabled?: boolean
  emptyLabel?: string
  showHeading?: boolean
  uploadError?: string | null
  className?: string
}

export function ReservationFilesPanel({
  attachments = [],
  files = [],
  onFilesChange,
  uploadDisabled = false,
  emptyLabel = 'Anexar documentos da proposta',
  showHeading = true,
  uploadError = null,
  className,
}: ReservationFilesPanelProps) {
  const canUpload = onFilesChange !== undefined

  return (
    <aside
      aria-label={showHeading ? 'Arquivos da reserva' : undefined}
      className={cn('flex h-full min-h-0 flex-col', showHeading && 'bg-muted/20', className)}
    >
      {showHeading ? (
        <div className="shrink-0 border-b px-4 py-3 pr-14">
          <p className="font-medium">Arquivos da reserva</p>
          <p className="text-xs text-muted-foreground">
            Comprovantes, documentos, PDFs e contratos enviados nesta reserva.
          </p>
        </div>
      ) : null}
      {attachments.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {groupedAttachments(attachments).map((group) => (
            <div key={group.kind} className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
              {group.items.map((attachment) => (
                <ReservationAttachmentPreview key={attachment.id} attachment={attachment} />
              ))}
            </div>
          ))}
        </div>
      ) : canUpload ? null : (
        <Empty className="min-h-0 flex-1 border-0">
          <EmptyHeader>
            <EmptyTitle>Nenhum arquivo enviado ainda</EmptyTitle>
            <EmptyDescription>Os arquivos desta reserva aparecem nesta área.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {canUpload ? (
        <div className={cn('flex min-h-0 flex-col', attachments.length > 0 ? 'shrink-0 border-t p-4' : 'min-h-0 flex-1 p-4')}>
          <ReservationAttachmentField
            className="min-h-0 flex-1"
            files={files}
            onFilesChange={onFilesChange}
            multiple
            disabled={uploadDisabled}
            variant="panel"
            emptyLabel={emptyLabel}
          />
          {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
        </div>
      ) : null}
    </aside>
  )
}
