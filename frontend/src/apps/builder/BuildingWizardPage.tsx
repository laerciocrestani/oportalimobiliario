import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import {
  BuildingWizardIdentityStep,
  emptyIdentityForm,
  type BuildingIdentityForm,
} from '@/apps/builder/components/BuildingWizardIdentityStep'
import { BuildingWizardMediaStep } from '@/apps/builder/components/BuildingWizardMediaStep'
import { BuildingWizardSteps } from '@/apps/builder/components/BuildingWizardSteps'
import {
  BuildingWizardTowersStep,
  emptyTowerDraft,
  type TowerDraft,
} from '@/apps/builder/components/BuildingWizardTowersStep'
import { BuildingWizardUnitsStep } from '@/apps/builder/components/BuildingWizardUnitsStep'
import { gridsFromBuilding, unitGridIsValid, unitGridPayload, type TowerUnitGrid } from '@/apps/builder/lib/unit-grid'
import {
  defaultsFromBuilding,
  defaultsUpdatePayload,
  identityFromBuilding,
  identityUpdatePayload,
} from '@/apps/builder/lib/building-form'
import { emptyBuildingDefaults, type BuildingDefaultsForm } from '@/apps/builder/lib/unit-spec'
import { Button } from '@/components/ui/button'
import { ApiRequestError, builderApi, type Amenity, type Building } from '@/lib/api'

type WizardLocationState = {
  step?: number
}

function defaultsPayload(defaults: BuildingDefaultsForm) {
  return {
    ...defaultsUpdatePayload(defaults),
    published: false,
    wizard_step: 3,
  }
}

function identityPayload(form: BuildingIdentityForm) {
  return {
    ...identityUpdatePayload(form),
    published: false,
    wizard_step: 1,
  }
}

function towersFromBuilding(building: Building): TowerDraft[] {
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

export function BuildingWizardPage() {
  const { buildingId } = useParams()
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
        const nextStep = fromState ?? Math.min((building.wizard_step ?? 1) + 1, 4)
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

  async function handleLookupCep() {
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

  function goToStep(step: number) {
    setCurrentStep(step)
    setMaxReachable((current) => Math.max(current, step))
  }

  async function handleIdentitySubmit() {
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

  async function handleTowersSubmit() {
    if (!buildingId) {
      return
    }

    const saved = await builderApi.replaceBuildingStructure(Number(buildingId), {
      towers: towers.map((tower) => ({
        name: tower.name.trim(),
        floors_count: tower.floorsCount,
      })),
    })

    setTowers(towersFromBuilding(saved))
    setUnitGrids(gridsFromBuilding(saved))
    setSelectedTowerIndex(0)
    setSelectedFloor(1)
    goToStep(3)
  }

  async function handleUnitsSubmit() {
    if (!buildingId) {
      return
    }

    await builderApi.updateBuilding(Number(buildingId), defaultsPayload(buildingDefaults))
    await builderApi.replaceBuildingUnitGrid(Number(buildingId), unitGridPayload(unitGrids))
    goToStep(4)
  }

  async function handleGenerateDescription() {
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

  async function handleMediaSubmit() {
    if (!buildingId) {
      return
    }

    const saved = await builderApi.updateBuilding(Number(buildingId), {
      description: description.trim() || null,
      published: !isDraft,
      wizard_step: 4,
    })

    if (saved.published) {
      navigate(`/buildings/${saved.id}`)
      return
    }

    navigate('/buildings')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (currentStep === 1) {
        await handleIdentitySubmit()
      } else if (currentStep === 2) {
        await handleTowersSubmit()
      } else if (currentStep === 3) {
        await handleUnitsSubmit()
      } else {
        await handleMediaSubmit()
      }
    } catch (err) {
      if (currentStep === 4 && err instanceof ApiRequestError && err.status === 422) {
        setError('Não é possível publicar: unidades à venda precisam ter preço.')
        return
      }

      setError(
        currentStep === 1
          ? 'Não foi possível salvar o empreendimento.'
          : currentStep === 2
            ? 'Não foi possível salvar as torres.'
            : currentStep === 3
              ? 'Não foi possível salvar as unidades.'
              : 'Não foi possível salvar a mídia e o descritivo.',
      )
    } finally {
      setSaving(false)
    }
  }

  const canContinue =
    currentStep === 1
      ? form.name.trim() !== ''
      : currentStep === 2
        ? towers.every((tower) => tower.name.trim() !== '' && tower.floorsCount >= 1)
        : currentStep === 3
          ? unitGridIsValid(unitGrids)
          : Boolean(buildingId)

  const selectedTower = towers[selectedTowerIndex] ?? towers[0]

  return (
    <BuilderDashboardShell title={buildingId ? 'Continuar cadastro' : 'Novo empreendimento'}>
      <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto w-full max-w-5xl space-y-6">
        <BuildingWizardSteps current={currentStep} maxReachable={maxReachable} onSelect={setCurrentStep} />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : currentStep === 1 ? (
          <>
            <div>
              <h2 className="text-base font-semibold">Identidade e endereço</h2>
              <p className="text-sm text-muted-foreground">
                Informe o nome e o endereço. Se a busca de CEP falhar, preencha os campos manualmente.
              </p>
            </div>
            <BuildingWizardIdentityStep
              form={form}
              onChange={setForm}
              onLookupCep={() => void handleLookupCep()}
              lookingUpCep={lookingUpCep}
              cepHint={cepHint}
            />
          </>
        ) : currentStep === 2 ? (
          <>
            <div>
              <h2 className="text-base font-semibold">Torres e andares</h2>
              <p className="text-sm text-muted-foreground">
                Defina quantas torres o empreendimento tem. Cada torre tem a própria quantidade de andares.
                Clique no prédio para selecionar uma torre ou um andar.
                {selectedTower
                  ? ` Selecionado: ${selectedTower.name || 'torre'}, andar ${selectedFloor ?? 1}.`
                  : null}
              </p>
            </div>
            <BuildingWizardTowersStep
              towers={towers}
              selectedTowerIndex={Math.min(selectedTowerIndex, towers.length - 1)}
              selectedFloor={selectedFloor}
              onChange={(next) => {
                setTowers(next)
                setSelectedTowerIndex((current) => Math.min(current, next.length - 1))
              }}
              onSelectTower={setSelectedTowerIndex}
              onSelectFloor={(_towerIndex, floor) => setSelectedFloor(floor)}
            />
          </>
        ) : currentStep === 3 ? (
          <>
            <div>
              <h2 className="text-base font-semibold">Unidades</h2>
              <p className="text-sm text-muted-foreground">
                Defina o padrão do empreendimento, a planta típica e a ficha da unidade selecionada.
                101, 201 e 301 herdam a mesma área. Exceção: clique no andar no prédio e altere só ele.
                {selectedTower ? ` ${selectedTower.name}, andar ${selectedFloor ?? 1}.` : null}
              </p>
            </div>
            <BuildingWizardUnitsStep
              grids={unitGrids}
              selectedTowerIndex={Math.min(selectedTowerIndex, Math.max(unitGrids.length - 1, 0))}
              selectedFloor={selectedFloor}
              defaults={buildingDefaults}
              amenities={amenities}
              onChange={setUnitGrids}
              onDefaultsChange={setBuildingDefaults}
              onSelectTower={setSelectedTowerIndex}
              onSelectFloor={(towerIndex, floor) => {
                setSelectedTowerIndex(towerIndex)
                setSelectedFloor(floor)
              }}
            />
          </>
        ) : (
          <>
            <div>
              <h2 className="text-base font-semibold">Mídia</h2>
              <p className="text-sm text-muted-foreground">
                Envie fotos internas e externas, escreva o descritivo e escolha se o cadastro continua
                como rascunho.
              </p>
            </div>
            {buildingId ? (
              <BuildingWizardMediaStep
                buildingId={Number(buildingId)}
                description={description}
                isDraft={isDraft}
                generating={generatingDescription}
                generateHint={generateHint}
                onDescriptionChange={setDescription}
                onDraftChange={setIsDraft}
                onGenerate={() => void handleGenerateDescription()}
              />
            ) : null}
          </>
        )}

        <div className="flex items-center justify-between gap-2">
          {currentStep === 1 ? (
            <Button variant="outline" nativeButton={false} render={<Link to="/buildings" />}>
              Voltar
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Voltar
            </Button>
          )}
          <Button type="submit" disabled={saving || loading || !canContinue}>
            {saving
              ? 'Salvando...'
              : currentStep === 4
                ? isDraft
                  ? 'Salvar rascunho'
                  : 'Publicar'
                : 'Salvar e continuar'}
          </Button>
        </div>
      </form>
    </BuilderDashboardShell>
  )
}
