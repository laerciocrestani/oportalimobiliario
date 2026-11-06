import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { builderApi, type ContractReview } from '@/lib/api'

type ContractReviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  onAccepted: () => void
}

export function ContractReviewDialog({
  open,
  onOpenChange,
  reservationId,
  onAccepted,
}: ContractReviewDialogProps) {
  const [review, setReview] = useState<ContractReview | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setEditing(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const next = await builderApi.getContractReview(reservationId)
        if (!cancelled) {
          setReview(next)
          setDraft(next.body)
        }
      } catch {
        if (!cancelled) {
          setError('Não foi possível carregar o contrato.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, reservationId])

  async function changeTemplate(templateId: string) {
    setSaving(true)
    setError(null)

    try {
      const next = await builderApi.updateContractReview(reservationId, {
        template_id: Number(templateId),
      })
      setReview(next)
      setDraft(next.body)
      setEditing(false)
    } catch {
      setError('Não foi possível trocar o modelo.')
    } finally {
      setSaving(false)
    }
  }

  async function saveDraft() {
    setSaving(true)
    setError(null)

    try {
      const next = await builderApi.updateContractReview(reservationId, { body: draft })
      setReview(next)
      setDraft(next.body)
      setEditing(false)
    } catch {
      setError('Não foi possível salvar a edição.')
    } finally {
      setSaving(false)
    }
  }

  async function accept() {
    setSaving(true)
    setError(null)

    try {
      await builderApi.acceptContractReview(reservationId)
      onAccepted()
      onOpenChange(false)
    } catch {
      setError('Não foi possível aceitar o contrato.')
    } finally {
      setSaving(false)
    }
  }

  const templates = review?.templates ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Contrato</DialogTitle>
          <DialogDescription>
            Leia o texto preenchido desta reserva. Aceitar gera o PDF e envia para assinatura.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {loading ? <p className="text-sm text-muted-foreground">Carregando contrato...</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {templates.length > 1 ? (
            <Select
              value={review?.template_id == null ? null : String(review.template_id)}
              onValueChange={(value) => {
                if (value !== null) {
                  void changeTemplate(value)
                }
              }}
              disabled={saving}
            >
              <SelectTrigger className="w-full" aria-label="Modelo do contrato">
                <SelectValue placeholder="Modelo">
                  {templates.find((template) => template.id === review?.template_id)?.name ?? null}
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
          ) : null}
          {editing ? (
            <Textarea
              aria-label="Texto do contrato"
              className="min-h-80 font-mono text-sm"
              value={draft}
              disabled={saving}
              onChange={(event) => setDraft(event.target.value)}
            />
          ) : review ? (
            <div
              className="max-h-[50vh] overflow-y-auto rounded-lg border p-4 text-sm [&_h1]:mb-3 [&_h1]:text-center [&_h1]:text-base [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-sm [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: review.html }}
            />
          ) : null}
        </DialogBody>
        <DialogFooter>
          {editing ? (
            <>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={saving || draft.trim() === ''} onClick={() => void saveDraft()}>
                Salvar
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={saving || review == null}
                onClick={() => {
                  setDraft(review?.body ?? '')
                  setEditing(true)
                }}
              >
                Editar
              </Button>
              <Button type="button" disabled={saving || review == null || review.body.trim() === ''} onClick={() => void accept()}>
                Aceitar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
