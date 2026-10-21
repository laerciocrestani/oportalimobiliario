import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { SignatureSettingsInput, SignatureWitnessKind } from '@/lib/api'

const fieldClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm'

export type WitnessSlotDraft = {
  kind: SignatureWitnessKind
  userId: string
}

type MemberOption = {
  id: number
  name: string
}

type SignatureSettingsFormProps = {
  members: MemberOption[]
  initialSignerId: string
  initialSlots: WitnessSlotDraft[]
  onSubmit: (input: SignatureSettingsInput) => Promise<void> | void
}

export function SignatureSettingsForm({
  members,
  initialSignerId,
  initialSlots,
  onSubmit,
}: SignatureSettingsFormProps) {
  const [signerId, setSignerId] = useState(initialSignerId)
  const [slots, setSlots] = useState<WitnessSlotDraft[]>(initialSlots)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function updateSlot(index: number, patch: Partial<WitnessSlotDraft>) {
    setSlots((current) => current.map((slot, slotIndex) => (
      slotIndex === index ? { ...slot, ...patch } : slot
    )))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (signerId === '') {
      setError('Escolha quem assina a proposta pela construtora.')
      return
    }

    if (slots.some((slot) => slot.kind === 'team_user' && slot.userId === '')) {
      setError('Escolha a pessoa do time para cada vaga.')
      return
    }

    setSaving(true)

    try {
      await onSubmit({
        proposal_signer_user_id: Number(signerId),
        witness_slots: slots.map((slot) => ({
          kind: slot.kind,
          user_id: slot.kind === 'selling_broker' ? null : Number(slot.userId),
        })),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="proposal-signer">Signatário da proposta</Label>
        <select
          id="proposal-signer"
          className={fieldClass}
          value={signerId}
          onChange={(event) => setSignerId(event.target.value)}
        >
          <option value="">Selecione uma pessoa do time</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {slots.map((slot, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`witness-kind-${index}`}>Vaga {index + 1}</Label>
              {slots.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index))}
                >
                  Remover
                </Button>
              ) : null}
            </div>
            <select
              id={`witness-kind-${index}`}
              aria-label={`Tipo da vaga ${index + 1}`}
              className={fieldClass}
              value={slot.kind}
              onChange={(event) => updateSlot(index, {
                kind: event.target.value as SignatureWitnessKind,
                userId: event.target.value === 'selling_broker' ? '' : slot.userId,
              })}
            >
              <option value="team_user">Pessoa do time</option>
              <option value="selling_broker">Corretor da venda</option>
            </select>
            {slot.kind === 'team_user' ? (
              <select
                id={`witness-user-${index}`}
                aria-label={`Pessoa da vaga ${index + 1}`}
                className={fieldClass}
                value={slot.userId}
                onChange={(event) => updateSlot(index, { userId: event.target.value })}
              >
                <option value="">Selecione</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">
                Na hora do contrato, esta vaga usa o corretor da reserva.
              </p>
            )}
          </div>
        ))}
      </div>

      {slots.length < 10 ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setSlots((current) => [...current, { kind: 'team_user', userId: '' }])}
        >
          Adicionar vaga
        </Button>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar assinaturas'}
      </Button>
    </form>
  )
}
