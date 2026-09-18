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
import {
  emptyTowerDraft,
  type TowerDraft,
} from '@/apps/builder/components/BuildingWizardTowersStep'
import { WizardPublishStep } from '@/apps/builder/components/WizardPublishStep'
import { WizardStructureStep } from '@/apps/builder/components/WizardStructureStep'
import {
  defaultsFromBuilding,
  defaultsUpdatePayload,
  identityFromBuilding,
  identityUpdatePayload,
} from '@/apps/builder/lib/building-form'
import { emptyBuildingDefaults, type BuildingDefaultsForm } from '@/apps/builder/lib/unit-spec'
import {
  gridsFromBuilding,
  unitGridIsValid,
  unitGridPayload,
  type TowerUnitGrid,
} from '@/apps/builder/lib/unit-grid'
import { resumeWizardUiStep, WIZARD_LAST_STEP } from '@/apps/builder/lib/wizard-steps'
import { Button } from '@/components/ui/button'
import { ApiRequestError, builderApi, type Amenity, type Building } from '@/lib/api'

export { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'

type WizardLocationState = {
  step?: number
}

function identityPayload(form: BuildingIdentityForm) {
  return {
    ...identityUpdatePayload(form),
    published: false,
    wizard_step: 1,
  }
}

function defaultsPayload(defaults: BuildingDefaultsForm) {
  return {
    ...defaultsUpdatePayload(defaults),
    published: false,
    wizard_step: 2,
  }
}

export function towersFromBuilding(building: Building): TowerDraft[] {
  if (!building.towers?.length) {
    return [emptyTowerDraft(0)]
  }

  return building.towers.map((tower, index) => ({
    key: String(tower.id ?? `tower-${index}`),
    id: tower.id,
    name: tower.name,
    floorsCount: tower.floors_count ?? tower.floors?.length ?? 1,
  }))
}

export function mergeUnitGrids(previous: TowerUnitGrid[], saved: Building): TowerUnitGrid[] {
  const generated = gridsFromBuilding(saved)

  return generated.map((grid) => previous.find((item) => item.towerId === grid.towerId) ?? grid)
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

type ProviderProps = {
  buildingId?: string
  children: ReactNode
}

export function BuildingWizardProvider({ buildingId, children }: ProviderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState<BuildingIdentityForm>(emptyIdentityForm)
  const [towers, setTowers] = useState<TowerDraft[]>(() => [emptyTowerDraft(0)])
  const [unitGrids, setUnitGrids] = useState<TowerUnitGrid[]>([])
  const [buildingDefaults, setBuildingDefaults] = useState<BuildingDefaultsForm>(emptyBuildingDefaults)
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [selectedTowerIndex, setSelectedTowerIndex] = useState(0)
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null)
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

        setForm(identityFromBuilding(building))
        setTowers(towersFromBuilding(building))
        setUnitGrids(gridsFromBuilding(building))
        setBuildingDefaults(defaultsFromBuilding(building))
        setSelectedTowerIndex(0)
        setSelectedFloor(1)
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

  useEffect(() => {
    let cancelled = false

    void builderApi
      .listAmenities()
      .then((items) => {
        if (!cancelled) {
          setAmenities(items)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAmenities([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  function goToStep(step: number) {
    setCurrentStep(step)
    setMaxReachable((current) => Math.max(current, step))
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

    const saved = await builderApi.replaceBuildingStructure(Number(buildingId), {
      towers: towers.map((tower) => ({
        name: tower.name.trim(),
        floors_count: tower.floorsCount,
      })),
    })

    const nextTowers = towersFromBuilding(saved)
    const nextGrids = mergeUnitGrids(unitGrids, saved)

    setTowers(nextTowers)
    setUnitGrids(nextGrids)
    setSelectedTowerIndex(0)
    setSelectedFloor(nextGrids[0]?.floors[0]?.number ?? 1)

    await builderApi.updateBuilding(Number(buildingId), defaultsPayload(buildingDefaults))
    await builderApi.replaceBuildingUnitGrid(Number(buildingId), unitGridPayload(nextGrids))
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
        ? towers.every((tower) => tower.name.trim() !== '' && tower.floorsCount >= 1) &&
          (unitGrids.length === 0 || unitGridIsValid(unitGrids))
        : Boolean(buildingId)

  const value: BuildingWizardContextValue = {
    state: {
      buildingId,
      form,
      towers,
      unitGrids,
      buildingDefaults,
      amenities,
      selectedTowerIndex,
      selectedFloor,
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
      setTowers: (next) => {
        setTowers(next)
        setSelectedTowerIndex((current) => Math.min(current, next.length - 1))
      },
      setUnitGrids,
      setBuildingDefaults,
      setSelectedTowerIndex,
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
