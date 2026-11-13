import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeftIcon } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BuildingWizardIdentityStep,
  emptyIdentityForm,
  type BuildingIdentityForm,
} from '@/apps/builder/components/BuildingWizardIdentityStep'
import {
  BuildingWizardContext,
  useBuildingWizard,
  type BuildingWizardContextValue,
} from '@/apps/builder/components/building-wizard-context'
import { Badge } from '@/components/ui/badge'
import { BuildingWizardSteps } from '@/apps/builder/components/BuildingWizardSteps'
import { WizardPublishStep } from '@/apps/builder/components/WizardPublishStep'
import { WizardReviewStep } from '@/apps/builder/components/WizardReviewStep'
import { WizardStructureStep } from '@/apps/builder/components/WizardStructureStep'
import { defaultsFromBuilding, defaultsUpdatePayload, identityFromBuilding, identityUpdatePayload } from '@/apps/builder/lib/building-form'
import { emptyBuildingDefaults } from '@/apps/builder/lib/unit-spec'
import {
  applySavedTowerIds,
  buildEntranceHall,
  buildSkeleton,
  cloneMirror,
  appendTower,
  DEFAULT_MIRROR,
  DEFAULT_SKELETON,
  isFloorStackValid,
  mirrorDraftFromTower,
  stacksFromBuilding,
  structurePayload,
  unitGridPayload,
  updateFloorUnit,
  type MirrorDraft,
  type SkeletonInput,
  type StackTower,
  type StackUnit,
} from '@/apps/builder/lib/floor-stack'
import { resumeWizardUiStep, WIZARD_LAST_STEP } from '@/apps/builder/lib/wizard-steps'
import { Button } from '@/components/ui/button'
import { ApiRequestError, builderApi } from '@/lib/api'

export { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'

type WizardLocationState = {
  step?: number
}

type ProviderProps = {
  buildingId?: string
  children: ReactNode
}

function preferredFloorNumber(towers: StackTower[]): number | null {
  const floors = towers[0]?.floors ?? []

  return floors.find((floor) => floor.number === 1)?.number ?? floors[0]?.number ?? null
}

function identityPayload(form: BuildingIdentityForm) {
  return {
    ...identityUpdatePayload(form),
    published: false,
    wizard_step: 1,
  }
}

function messageFromError(err: unknown): string | null {
  if (!(err instanceof ApiRequestError)) {
    return null
  }

  const details = err.errors ? Object.values(err.errors).flat() : []

  return details[0] ?? err.message ?? null
}

function stepErrorMessage(step: number) {
  if (step === 1) {
    return 'Não foi possível salvar o empreendimento.'
  }

  if (step === 2) {
    return 'Não foi possível salvar a estrutura.'
  }

  return 'Não foi possível salvar a mídia e o descritivo.'
}

export function BuildingWizardProvider({ buildingId, children }: ProviderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState<BuildingIdentityForm>(emptyIdentityForm)
  const [stackTowers, setStackTowers] = useState<StackTower[]>([])
  const [skeleton, setSkeletonState] = useState<SkeletonInput>(DEFAULT_SKELETON)
  const [selectedTowerIndex, setSelectedTowerIndex] = useState(0)
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null)
  const [mirror, setMirrorState] = useState<MirrorDraft>({ ...DEFAULT_MIRROR })
  const [description, setDescription] = useState('')
  const [defaults, setDefaults] = useState(emptyBuildingDefaults)
  const [isDraft, setIsDraft] = useState(true)
  const [updatingExisting, setUpdatingExisting] = useState(false)
  const [generatingDescription, setGeneratingDescription] = useState(false)
  const [generateHint, setGenerateHint] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(
    () => (location.state as WizardLocationState | null)?.step ?? 1,
  )
  const [maxReachable, setMaxReachable] = useState(
    () => (location.state as WizardLocationState | null)?.step ?? 1,
  )
  const [loading, setLoading] = useState(Boolean(buildingId))
  const [saving, setSaving] = useState(false)
  const [lookingUpCep, setLookingUpCep] = useState(false)
  const [cepHint, setCepHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!buildingId) {
      return
    }

    let cancelled = false

    void builderApi
      .getBuilding(buildingId)
      .then((building) => {
        if (cancelled) {
          return
        }

        const nextTowers = stacksFromBuilding(building)
        setForm(identityFromBuilding(building))
        setStackTowers(nextTowers)
        setSelectedTowerIndex(0)
        setSelectedFloor(preferredFloorNumber(nextTowers))
        setMirrorState(mirrorDraftFromTower(nextTowers[0]))
        setDescription(building.description ?? '')
        setDefaults(defaultsFromBuilding(building))
        setIsDraft(!building.published)
        setUpdatingExisting(building.published)

        const fromState = (location.state as WizardLocationState | null)?.step
        const nextStep = resumeWizardUiStep(building.wizard_step, fromState)
        setCurrentStep(nextStep)
        setMaxReachable(WIZARD_LAST_STEP)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Não foi possível carregar o empreendimento.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [buildingId, location.state])

  function goToStep(step: number) {
    setCurrentStep(step)
    setMaxReachable((current) => Math.max(current, step))
  }

  function setSkeleton(patch: Partial<SkeletonInput>) {
    setSkeletonState((current) => ({ ...current, ...patch }))
  }

  function generateSkeleton() {
    const next = buildSkeleton({ ...skeleton, towerCount: 1 })
    setStackTowers(next)
    setSelectedTowerIndex(0)
    setSelectedFloor(preferredFloorNumber(next))
    setMirrorState(mirrorDraftFromTower(next[0]))
  }

  function startEntranceHall() {
    const tower = buildEntranceHall()
    setStackTowers([tower])
    setSelectedTowerIndex(0)
    setSelectedFloor(tower.floors[0]?.number ?? 0)
    setMirrorState(mirrorDraftFromTower(tower))
  }

  function updateSelectedTower(tower: StackTower) {
    setStackTowers((current) =>
      current.map((item, index) => (index === selectedTowerIndex ? tower : item)),
    )
  }

  function addTower(input: { name: string; sourceKey?: string | null }) {
    const source = input.sourceKey
      ? stackTowers.find((tower) => tower.key === input.sourceKey)
      : undefined

    if (input.sourceKey && !source) {
      return
    }

    const next = appendTower(stackTowers, { name: input.name, source, skeleton })

    if (next.length === stackTowers.length) {
      return
    }

    const index = next.length - 1
    const created = next[index]

    setStackTowers(next)

    if (!created) {
      return
    }

    setSelectedTowerIndex(index)
    setSelectedFloor(preferredFloorNumber([created]))
    setMirrorState(mirrorDraftFromTower(created))
  }

  function removeSelectedTower() {
    if (stackTowers.length <= 1 || stackTowers[selectedTowerIndex]?.locked) {
      return
    }

    const next = stackTowers.filter((_, index) => index !== selectedTowerIndex)
    const index = Math.min(selectedTowerIndex, next.length - 1)
    const selected = next[index]

    setStackTowers(next)
    setSelectedTowerIndex(index)
    setSelectedFloor(preferredFloorNumber(selected ? [selected] : next))
    setMirrorState(mirrorDraftFromTower(selected))
  }

  function setSelectedTowerIndexAndMirror(index: number) {
    setSelectedTowerIndex(index)
    setMirrorState(mirrorDraftFromTower(stackTowers[index]))
  }

  function setMirror(patch: Partial<MirrorDraft>) {
    setMirrorState((current) => ({ ...current, ...patch }))
  }

  function cloneSelectedMirror() {
    setStackTowers((current) =>
      current.map((tower, index) =>
        index === selectedTowerIndex ? cloneMirror(tower, mirror.referenceNumber, mirror) : tower,
      ),
    )
  }

  function updateStackUnit(unitKey: string, patch: Partial<StackUnit>) {
    setStackTowers((current) =>
      current.map((tower, index) =>
        index === selectedTowerIndex && selectedFloor != null
          ? updateFloorUnit(tower, selectedFloor, unitKey, patch)
          : tower,
      ),
    )
  }

  async function lookupCep() {
    if (form.zip.length !== 8) {
      return
    }

    setLookingUpCep(true)
    setCepHint(null)

    try {
      const address = await builderApi.lookupCep(form.zip)
      setForm((current) => ({
        ...current,
        street: address.street || current.street,
        neighborhood: address.neighborhood || current.neighborhood,
        city: address.city || current.city,
        state: address.state || current.state,
        complement: address.complement || current.complement,
      }))
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setCepHint('CEP não encontrado. Preencha o endereço manualmente.')
      } else {
        setCepHint('Não foi possível consultar o CEP. Preencha o endereço manualmente.')
      }
    } finally {
      setLookingUpCep(false)
    }
  }

  async function persistIdentity() {
    const payload = identityPayload(form)
    const saved = buildingId
      ? await builderApi.updateBuilding(buildingId, payload)
      : await builderApi.createBuilding(payload)

    if (!buildingId) {
      navigate(`/buildings/${saved.id}/wizard`, { replace: true, state: { step: 2 } })
      return
    }

    goToStep(2)
  }

  async function persistStructure() {
    if (!buildingId) {
      return
    }

    const saved = await builderApi.replaceBuildingStructure(buildingId, structurePayload(stackTowers))
    const nextTowers = applySavedTowerIds(stackTowers, saved)
    setStackTowers(nextTowers)
    setSelectedTowerIndex(0)
    setSelectedFloor(preferredFloorNumber(nextTowers))
    setMirrorState(mirrorDraftFromTower(nextTowers[0]))
    await builderApi.replaceBuildingUnitGrid(buildingId, unitGridPayload(nextTowers))
    goToStep(3)
  }

  function persistReview() {
    goToStep(4)
  }

  async function persistPublish() {
    if (!buildingId) {
      return
    }

    const saved = await builderApi.updateBuilding(buildingId, {
      description: description.trim() || null,
      ...defaultsUpdatePayload(defaults),
      published: !isDraft,
      wizard_step: WIZARD_LAST_STEP,
    })

    if (saved.published) {
      navigate(`/buildings/${saved.id}`)
      return
    }

    navigate('/buildings')
  }

  async function persistStep(step: number) {
    if (step === 1) {
      await persistIdentity()
      return
    }

    if (step === 2) {
      await persistStructure()
      return
    }

    if (step === 3) {
      persistReview()
      return
    }

    await persistPublish()
  }

  async function generateDescription() {
    if (!buildingId) {
      return
    }

    setGeneratingDescription(true)
    setGenerateHint(null)

    try {
      const generated = await builderApi.generateBuildingDescription(buildingId)
      setDescription(generated.description)
    } catch {
      setGenerateHint('Não foi possível gerar o descritivo. Preencha manualmente.')
    } finally {
      setGeneratingDescription(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await persistStep(currentStep)
    } catch (err) {
      setError(messageFromError(err) ?? stepErrorMessage(currentStep))
    } finally {
      setSaving(false)
    }
  }

  const canContinue =
    currentStep === 1
      ? form.name.trim() !== ''
      : currentStep === 2
        ? isFloorStackValid(stackTowers)
        : Boolean(buildingId)

  const value: BuildingWizardContextValue = {
    state: {
      buildingId,
      form,
      stackTowers,
      skeleton,
      selectedTowerIndex,
      selectedFloor,
      mirror,
      description,
      defaults,
      isDraft,
      updatingExisting,
      generatingDescription,
      generateHint,
      currentStep,
      maxReachable,
      loading,
      saving,
      lookingUpCep,
      cepHint,
      error,
    },
    actions: {
      setForm,
      setSkeleton,
      generateSkeleton,
      startEntranceHall,
      updateStackUnit,
      updateSelectedTower,
      addTower,
      removeSelectedTower,
      setMirror,
      cloneMirror: cloneSelectedMirror,
      setSelectedTowerIndex: setSelectedTowerIndexAndMirror,
      setSelectedFloor,
      setDescription,
      setDefaults,
      setIsDraft,
      setCurrentStep,
      lookupCep,
      generateDescription,
      persistStep,
      submit,
    },
    meta: { canContinue },
  }

  return <BuildingWizardContext value={value}>{children}</BuildingWizardContext>
}

function WizardFrame({ children }: { children: ReactNode }) {
  const { state, actions } = useBuildingWizard()
  const title = state.updatingExisting
    ? `Editar ${state.form.name || 'empreendimento'}`
    : state.buildingId
      ? 'Continuar cadastro'
      : 'Novo empreendimento'
  const place = [state.form.city.trim(), state.form.state.trim()].filter(Boolean).join(', ')

  return (
    <form
      onSubmit={(event) => {
        void actions.submit(event)
      }}
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-6"
    >
      <header className="flex shrink-0 flex-col gap-4 border-b pb-5">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {place ? `Empreendimento · ${place}` : 'Empreendimento'}
          </p>
          <p className="truncate text-2xl font-semibold tracking-tight">{state.form.name || 'Empreendimento'}</p>
          <p className="text-sm text-muted-foreground">
            {state.currentStep === 2
              ? 'Acompanhe os pavimentos e as unidades do empreendimento.'
              : 'Cadastre os dados e monte a estrutura do seu empreendimento.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-base font-medium">{title}</h1>
          {state.updatingExisting ? null : <Badge variant="secondary">Rascunho</Badge>}
        </div>
      </header>
      {children}
    </form>
  )
}

function WizardStepsNav() {
  const { state, actions } = useBuildingWizard()

  return (
    <BuildingWizardSteps
      current={state.currentStep}
      maxReachable={state.maxReachable}
      onSelect={actions.setCurrentStep}
    />
  )
}

function WizardIdentitySection() {
  const { state, actions } = useBuildingWizard()

  return (
    <BuildingWizardIdentityStep
      form={state.form}
      onChange={actions.setForm}
      onLookupCep={() => void actions.lookupCep()}
      lookingUpCep={state.lookingUpCep}
      cepHint={state.cepHint}
      priceModeLocked={state.stackTowers.some((tower) =>
        tower.floors.some((floor) => floor.units.some((unit) => unit.priceBase.trim() !== '')),
      )}
    />
  )
}

function WizardCurrentStep() {
  const { state } = useBuildingWizard()

  let step = <WizardPublishStep />

  if (state.loading) {
    step = <p className="text-sm text-muted-foreground">Carregando...</p>
  } else if (state.currentStep === 1) {
    step = <WizardIdentitySection />
  } else if (state.currentStep === 2) {
    step = <WizardStructureStep />
  } else if (state.currentStep === 3) {
    step = <WizardReviewStep />
  }

  return <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">{step}</div>
}

function WizardFooter() {
  const { state, actions, meta } = useBuildingWizard()

  return (
    <div className="flex shrink-0 items-center gap-4 border-t pt-4">
      <div className="min-w-0 flex-1">
        <WizardStepsNav />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {state.currentStep === 1 ? (
          <Button variant="outline" nativeButton={false} render={<Link to="/buildings" />}>
            Cancelar
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Voltar"
            onClick={() => actions.setCurrentStep(state.currentStep - 1)}
          >
            <ArrowLeftIcon />
          </Button>
        )}
        <Button type="submit" disabled={state.saving || state.loading || !meta.canContinue} aria-label={
          state.saving
            ? 'Salvando...'
            : state.currentStep === WIZARD_LAST_STEP
              ? state.updatingExisting
                ? 'Atualizar empreendimento'
                : state.isDraft
                  ? 'Salvar rascunho'
                  : 'Publicar'
              : 'Salvar e continuar'
        }>
          {state.saving
            ? 'Salvando...'
            : state.currentStep === WIZARD_LAST_STEP
              ? state.updatingExisting
                ? 'Atualizar empreendimento'
                : state.isDraft
                  ? 'Salvar rascunho'
                  : 'Publicar'
              : 'Continuar'}
        </Button>
      </div>
    </div>
  )
}

function WizardError() {
  const { state } = useBuildingWizard()

  if (!state.error) {
    return null
  }

  return <p className="text-sm text-destructive">{state.error}</p>
}

export const BuildingWizard = {
  Provider: BuildingWizardProvider,
  Frame: WizardFrame,
  Steps: WizardStepsNav,
  CurrentStep: WizardCurrentStep,
  Footer: WizardFooter,
  Error: WizardError,
}
