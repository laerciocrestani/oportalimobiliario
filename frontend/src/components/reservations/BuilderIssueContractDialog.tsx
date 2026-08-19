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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { builderApi, type ContractIssuePreview } from '@/lib/api'

type BuilderIssueContractDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  onIssued: () => void
}

export function BuilderIssueContractDialog({
  open,
  onOpenChange,
  reservationId,
  onIssued,
}: BuilderIssueContractDialogProps) {
  const [templates, setTemplates] = useState<Array<{ id: number; name: string }>>([])
  const [templateId, setTemplateId] = useState<string>('')
  const [preview, setPreview] = useState<ContractIssuePreview | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadTemplates() {
      try {
        setError(null)
        const nextTemplates = await builderApi.listIssueContractTemplates(reservationId)
        if (cancelled) {
          return
        }
        setTemplates(nextTemplates)
        setTemplateId(nextTemplates[0] ? String(nextTemplates[0].id) : '')
      } catch {
        if (!cancelled) {
          setError('Não foi possível carregar os modelos para emissão.')
        }
      }
    }

    void loadTemplates()

    return () => {
      cancelled = true
    }
  }, [open, reservationId])

  useEffect(() => {
    if (!open || templateId === '') {
      setPreview(null)
      return
    }

    let cancelled = false

    async function loadPreview() {
      try {
        setLoading(true)
        setError(null)
        const nextPreview = await builderApi.previewContractIssue(reservationId, Number(templateId))
        if (cancelled) {
          return
        }
        setPreview(nextPreview)
        setValues({ ...nextPreview.system_values })
        setPrice(nextPreview.suggested_price === null ? '' : String(nextPreview.suggested_price))
      } catch {
        if (!cancelled) {
          setError('Não foi possível carregar os dados do modelo.')
          setPreview(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [open, reservationId, templateId])

  async function handleSubmit() {
    if (templateId === '') {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await builderApi.issueContract(reservationId, {
        contract_template_id: Number(templateId),
        values,
        final_price_brl: Number(price.replace(',', '.')),
      })
      onIssued()
      onOpenChange(false)
    } catch {
      setError('Não foi possível emitir o contrato. Verifique os campos obrigatórios.')
    } finally {
      setSubmitting(false)
    }
  }

  const requiredSlugs = preview?.required_custom_slugs ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Emitir contrato</DialogTitle>
          <DialogDescription>
            Escolha o modelo, confira os valores e o preço final em R$.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
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
              <SelectTrigger className="w-full" aria-label="Modelo">
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

          {loading ? <p className="text-sm text-muted-foreground">Carregando campos...</p> : null}

          {preview ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="final-price">Valor final (R$)</Label>
                <Input
                  id="final-price"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              </div>

              {requiredSlugs.map((slug) => {
                const label =
                  preview.custom_variables.find((variable) => variable.slug === slug)?.label ?? slug

                return (
                  <div key={slug} className="space-y-2">
                    <Label htmlFor={`value-${slug}`}>{label}</Label>
                    <Input
                      id={`value-${slug}`}
                      value={values[slug] ?? ''}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [slug]: event.target.value }))
                      }
                    />
                  </div>
                )
              })}

              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">Valores do sistema</summary>
                <div className="mt-3 space-y-3">
                  {Object.entries(preview.system_values).map(([slug, value]) => (
                    <div key={slug} className="space-y-1">
                      <Label htmlFor={`system-${slug}`}>{slug}</Label>
                      <Input
                        id={`system-${slug}`}
                        value={values[slug] ?? value}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [slug]: event.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </details>
            </>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={submitting || templateId === ''} onClick={() => void handleSubmit()}>
            {submitting ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
