import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
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
import { BuildingWizardSteps } from '@/apps/builder/components/BuildingWizardSteps'
import { WizardPublishStep } from '@/apps/builder/components/WizardPublishStep'
import { WizardStructureStep } from '@/apps/builder/components/WizardStructureStep'
import { identityFromBuilding, identityUpdatePayload } from '@/apps/builder/lib/building-form'
import {
  applySavedTowerIds,
  buildSkeleton,
  cloneMirror,
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
  const [isDraft, setIsDraft] = useState(true)
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
      .getBuilding(Number(buildingId))
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
        setIsDraft(!building.published)

        const fromState = (location.state as WizardLocationState | null)?.step
        const nextStep = resumeWizardUiStep(building.wizard_step, fromState)
        setCurrentStep(nextStep)
        setMaxReachable(Math.max(nextStep, 1))
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
    const next = buildSkeleton(skeleton)
    setStackTowers(next)
    setSelectedTowerIndex(0)
    setSelectedFloor(preferredFloorNumber(next))
    setMirrorState(mirrorDraftFromTower(next[0]))
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
      ? await builderApi.updateBuilding(Number(buildingId), payload)
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

    const saved = await builderApi.replaceBuildingStructure(Number(buildingId), structurePayload(stackTowers))
    const nextTowers = applySavedTowerIds(stackTowers, saved)
    setStackTowers(nextTowers)
    setSelectedTowerIndex(0)
    setSelectedFloor(preferredFloorNumber(nextTowers))
    setMirrorState(mirrorDraftFromTower(nextTowers[0]))
    await builderApi.replaceBuildingUnitGrid(Number(buildingId), unitGridPayload(nextTowers))
    goToStep(3)
  }

  async function persistPublish() {
    if (!buildingId) {
      return
    }

    const saved = await builderApi.updateBuilding(Number(buildingId), {
      description: description.trim() || null,
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

    await persistPublish()
  }

  async function generateDescription() {
    if (!buildingId) {
      return
    }

    setGeneratingDescription(true)
    setGenerateHint(null)

    try {
      const generated = await builderApi.generateBuildingDescription(Number(buildingId))
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
      if (currentStep === WIZARD_LAST_STEP && err instanceof ApiRequestError && err.status === 422) {
        setError('Não é possível publicar: unidades à venda precisam ter preço.')
        return
      }

      setError(stepErrorMessage(currentStep))
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
      isDraft,
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
      updateStackUnit,
      setMirror,
      cloneMirror: cloneSelectedMirror,
      setSelectedTowerIndex: setSelectedTowerIndexAndMirror,
      setSelectedFloor,
      setDescription,
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
  const { actions } = useBuildingWizard()

  return (
    <form
      onSubmit={(event) => {
        void actions.submit(event)
      }}
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
    >
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
    <>
      <div>
        <h2 className="text-base font-semibold">Identidade e endereço</h2>
        <p className="text-sm text-muted-foreground">
          Informe o nome e o endereço. Se a busca de CEP falhar, preencha os campos manualmente.
        </p>
      </div>
      <BuildingWizardIdentityStep
        form={state.form}
        onChange={actions.setForm}
        onLookupCep={() => void actions.lookupCep()}
        lookingUpCep={state.lookingUpCep}
        cepHint={state.cepHint}
      />
    </>
  )
}

function WizardCurrentStep() {
  const { state } = useBuildingWizard()

  if (state.loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>
  }

  if (state.currentStep === 1) {
    return <WizardIdentitySection />
  }

  if (state.currentStep === 2) {
    return <WizardStructureStep />
  }

  return <WizardPublishStep />
}

function WizardFooter() {
  const { state, actions, meta } = useBuildingWizard()

  return (
    <div className="flex items-center justify-between gap-2">
      {state.currentStep === 1 ? (
        <Button variant="outline" nativeButton={false} render={<Link to="/buildings" />}>
          Voltar
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={() => actions.setCurrentStep(state.currentStep - 1)}>
          Voltar
        </Button>
      )}
      <Button type="submit" disabled={state.saving || state.loading || !meta.canContinue}>
        {state.saving
          ? 'Salvando...'
          : state.currentStep === WIZARD_LAST_STEP
            ? state.isDraft
              ? 'Salvar rascunho'
              : 'Publicar'
            : 'Salvar e continuar'}
      </Button>
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
