import { useEffect, useState } from 'react'
import { SignatureSettingsForm, type WitnessSlotDraft } from '@/apps/builder/components/SignatureSettingsForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { builderApi, type SignatureSettings, type TeamMember } from '@/lib/api'

const emptySlots: WitnessSlotDraft[] = [
  { kind: 'team_user', userId: '' },
  { kind: 'team_user', userId: '' },
]

function slotsFromSettings(settings: SignatureSettings): WitnessSlotDraft[] {
  if (settings.witness_slots.length === 0) {
    return emptySlots
  }

  return settings.witness_slots.map((slot) => ({
    kind: slot.kind,
    userId: slot.user_id === null ? '' : String(slot.user_id),
  }))
}

export function SignatureSettingsCard({ members }: { members: TeamMember[] }) {
  const [settings, setSettings] = useState<SignatureSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const next = await builderApi.getSignatureSettings()
        if (!cancelled) {
          setSettings(next)
        }
      } catch {
        if (!cancelled) {
          setError('Não foi possível carregar a configuração de assinatura.')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinaturas</CardTitle>
        <CardDescription>
          O signatário da proposta e as testemunhas do contrato valem para os documentos gerados depois de salvar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {settings === null && error === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : null}
        {settings ? (
          <div className="flex flex-col gap-3">
            <SignatureSettingsForm
              members={members}
              initialSignerId={settings.proposal_signer_user_id === null ? '' : String(settings.proposal_signer_user_id)}
              initialSlots={slotsFromSettings(settings)}
              onSubmit={async (input) => {
                setSaved(false)
                setError(null)
                try {
                  const next = await builderApi.updateSignatureSettings(input)
                  setSettings(next)
                  setSaved(true)
                } catch {
                  setError('Não foi possível salvar a configuração de assinatura.')
                }
              }}
            />
            {saved ? <p className="text-sm text-muted-foreground">Configuração salva.</p> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
