import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReservationAttachmentPreview } from '@/components/reservations/ReservationAttachmentPreview'
import {
  ReservationAttachmentField,
  type ReservationFileItem,
} from '@/components/reservations/ReservationAttachmentField'
import { latestAttachmentByKind } from '@/components/reservations/download-reservation-attachment'
import {
  builderApi,
  type ProposalDecision,
  type ProposalIssuePreview,
  type ReservationAttachment,
  type ReservationProposal,
} from '@/lib/api'

type BuilderProposalDecisionPanelProps = {
  reservationId: number
  proposal: ReservationProposal
  attachments?: ReservationAttachment[]
  onDecided: () => void
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function ProposalAttachments({ attachments }: { attachments?: ReservationAttachment[] }) {
  if (!attachments?.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">Anexos da proposta</p>
      {attachments.map((attachment) => (
        <ReservationAttachmentPreview key={attachment.id} attachment={attachment} />
      ))}
    </div>
  )
}

export function BuilderProposalDecisionPanel({
  reservationId,
  proposal,
  attachments = [],
  onDecided,
}: BuilderProposalDecisionPanelProps) {
  const [decisionNote, setDecisionNote] = useState('')
  const [submitting, setSubmitting] = useState<ProposalDecision | 'issue' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Array<{ id: number; name: string }>>([])
  const [templateId, setTemplateId] = useState('')
  const [preview, setPreview] = useState<ProposalIssuePreview | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [signedFiles, setSignedFiles] = useState<ReservationFileItem[]>([])
  const note = decisionNote.trim()
  const generatedPdf = latestAttachmentByKind(attachments, 'proposal_pdf')
  const requiredSlugs = preview?.required_custom_slugs ?? []

  useEffect(() => {
    let cancelled = false

    async function loadTemplates() {
      try {
        const nextTemplates = await builderApi.listIssueProposalTemplates(reservationId)
        if (cancelled) {
          return
        }
        setTemplates(nextTemplates)
        setTemplateId(nextTemplates[0] ? String(nextTemplates[0].id) : '')
      } catch {
        if (!cancelled) {
          setTemplates([])
        }
      }
    }

    void loadTemplates()

    return () => {
      cancelled = true
    }
  }, [reservationId])

  useEffect(() => {
    if (templateId === '') {
      setPreview(null)
      return
    }

    let cancelled = false

    async function loadPreview() {
      try {
        const nextPreview = await builderApi.previewProposalIssue(reservationId, Number(templateId))
        if (cancelled) {
          return
        }
        setPreview(nextPreview)
        setValues({ ...nextPreview.system_values })
      } catch {
        if (!cancelled) {
          setPreview(null)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [reservationId, templateId])

  async function handleIssue() {
    if (templateId === '') {
      return
    }

    setSubmitting('issue')
    setError(null)

    try {
      await builderApi.issueProposal(reservationId, {
        proposal_template_id: Number(templateId),
        values,
      })
      onDecided()
    } catch {
      setError('Não foi possível gerar o PDF da proposta. Verifique o modelo e os campos.')
    } finally {
      setSubmitting(null)
    }
  }

  async function handleDecision(decision: ProposalDecision) {
    if ((decision === 'returned' || decision === 'rejected') && note === '') {
      setError('Informe o motivo para devolver ou recusar a proposta.')
      return
    }

    if (decision === 'accepted' && signedFiles[0] === undefined) {
      setError('Anexe o PDF da proposta assinado pela construtora para aceitar.')
      return
    }

    setSubmitting(decision)
    setError(null)

    try {
      if (decision === 'accepted' && signedFiles[0]) {
        await builderApi.acceptReservationProposal(reservationId, signedFiles[0].file, decisionNote)
      } else {
        await builderApi.decideReservationProposal(reservationId, decision, decisionNote)
      }
      onDecided()
    } catch {
      setError('Não foi possível registrar a decisão da proposta.')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Proposta v{proposal.version}</p>
        <p className="text-sm text-muted-foreground">
          {proposal.client_name}
          {hasText(proposal.client_phone) ? ` · ${proposal.client_phone}` : ''}
        </p>
      </div>

      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Proposta</dt>
          <dd className="whitespace-pre-wrap">{proposal.payment_terms}</dd>
        </div>
      </dl>

      <ProposalAttachments attachments={proposal.attachments} />

      {templates.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <p className="text-sm font-medium">Gerar PDF da proposta</p>
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select
              value={templateId === '' ? null : templateId}
              onValueChange={(value) => {
                if (value === null) {
                  return
                }
                setTemplateId(value)
              }}
            >
              <SelectTrigger className="w-full" aria-label="Modelo de proposta">
                <SelectValue placeholder="Selecione um modelo">
                  {templates.find((template) => String(template.id) === templateId)?.name || null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={String(template.id)}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiredSlugs.map((slug) => {
            const label = preview?.custom_variables.find((variable) => variable.slug === slug)?.label ?? slug

            return (
              <div key={slug} className="space-y-2">
                <Label htmlFor={`proposal-value-${slug}`}>{label}</Label>
                <Input
                  id={`proposal-value-${slug}`}
                  value={values[slug] ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [slug]: event.target.value }))
                  }
                />
              </div>
            )
          })}

          {generatedPdf ? <ReservationAttachmentPreview attachment={generatedPdf} /> : null}

          <Button
            type="button"
            variant="outline"
            disabled={submitting !== null || templateId === ''}
            onClick={() => void handleIssue()}
          >
            {submitting === 'issue' ? 'Gerando...' : generatedPdf ? 'Reemitir PDF' : 'Gerar PDF'}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label>PDF assinado pela construtora</Label>
        <ReservationAttachmentField
          files={signedFiles}
          onFilesChange={setSignedFiles}
          accept="application/pdf"
          disabled={submitting !== null}
          emptyLabel="Selecionar PDF assinado"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="decision-note">Observação da decisão</Label>
        <textarea
          id="decision-note"
          className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={decisionNote}
          onChange={(e) => setDecisionNote(e.target.value)}
          placeholder="Obrigatório para devolução ou recusa. O texto entra no diálogo com o corretor."
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={submitting !== null || signedFiles.length === 0}
          onClick={() => void handleDecision('accepted')}
        >
          {submitting === 'accepted' ? 'Processando...' : 'Aceitar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submitting !== null || note === ''}
          onClick={() => void handleDecision('returned')}
        >
          {submitting === 'returned' ? 'Processando...' : 'Devolver'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={submitting !== null || note === ''}
          onClick={() => void handleDecision('rejected')}
        >
          {submitting === 'rejected' ? 'Processando...' : 'Recusar'}
        </Button>
      </div>
    </div>
  )
}
