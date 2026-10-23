import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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

export function BuilderProposalDecisionPanel({
  reservationId,
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
    if (decision === 'rejected' && note === '') {
      setError('Informe o motivo para recusar a proposta.')
      return
    }

    setSubmitting(decision)
    setError(null)

    try {
      await builderApi.decideReservationProposal(reservationId, decision, decisionNote)
      onDecided()
    } catch {
      setError('Não foi possível registrar a decisão da proposta.')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <FieldGroup className="gap-3">
      {templates.length > 0 ? (
        <>
          {templates.length > 1 ? (
            <Field>
              <FieldLabel>Modelo</FieldLabel>
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
            </Field>
          ) : null}
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={submitting !== null || templateId === ''}
              onClick={() => void handleIssue()}
            >
              {submitting === 'issue' ? 'Gerando...' : generatedPdf ? 'Reemitir PDF' : 'Gerar PDF'}
            </Button>
          </div>

          {requiredSlugs.map((slug) => {
            const label = preview?.custom_variables.find((variable) => variable.slug === slug)?.label ?? slug

            return (
              <Field key={slug}>
                <FieldLabel htmlFor={`proposal-value-${slug}`}>{label}</FieldLabel>
                <Input
                  id={`proposal-value-${slug}`}
                  value={values[slug] ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [slug]: event.target.value }))
                  }
                />
              </Field>
            )
          })}
        </>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Ao aceitar, a proposta segue para assinatura do cliente, do signatário da construtora e do corretor.
      </p>

      <Field>
        <FieldLabel htmlFor="decision-note">Observação da decisão</FieldLabel>
        <Textarea
          id="decision-note"
          className="min-h-16"
          value={decisionNote}
          onChange={(e) => setDecisionNote(e.target.value)}
          placeholder="Obrigatório para recusa."
        />
      </Field>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={submitting !== null}
          onClick={() => void handleDecision('accepted')}
        >
          {submitting === 'accepted' ? 'Processando...' : 'Aceitar'}
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
    </FieldGroup>
  )
}
