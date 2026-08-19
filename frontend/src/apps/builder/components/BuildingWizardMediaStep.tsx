import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BuildingMediaGallery } from '@/apps/builder/components/BuildingMediaGallery'

type BuildingWizardMediaStepProps = {
  buildingId: number
  description: string
  isDraft: boolean
  generating: boolean
  generateHint: string | null
  onDescriptionChange: (value: string) => void
  onDraftChange: (isDraft: boolean) => void
  onGenerate: () => void
}

export function BuildingWizardMediaStep({
  buildingId,
  description,
  isDraft,
  generating,
  generateHint,
  onDescriptionChange,
  onDraftChange,
  onGenerate,
}: BuildingWizardMediaStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <BuildingMediaGallery buildingId={buildingId} showFloorPlans={false} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label htmlFor="wizard-building-description">Descritivo</Label>
          <Button type="button" variant="outline" size="sm" disabled={generating} onClick={onGenerate}>
            {generating ? 'Gerando...' : 'Gerar descrição com IA'}
          </Button>
        </div>
        <Textarea
          id="wizard-building-description"
          rows={8}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Descreva o empreendimento para o portal. Você pode gerar um texto e editar depois."
        />
        {generateHint ? <p className="text-sm text-destructive">{generateHint}</p> : null}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <input
          id="wizard-draft"
          type="checkbox"
          className="size-4 accent-primary"
          checked={isDraft}
          onChange={(event) => onDraftChange(event.target.checked)}
        />
        <Label htmlFor="wizard-draft">Rascunho</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        Com o rascunho ligado, o empreendimento não aparece no portal e você pode retomar o cadastro.
        Desligue para publicar — unidades à venda precisam ter preço.
      </p>
    </div>
  )
}
