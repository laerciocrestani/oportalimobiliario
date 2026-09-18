import { createContext, use, type FormEvent } from 'react'
import type { BuildingIdentityForm } from '@/apps/builder/components/BuildingWizardIdentityStep'
import type { TowerDraft } from '@/apps/builder/components/BuildingWizardTowersStep'
import type { BuildingDefaultsForm } from '@/apps/builder/lib/unit-spec'
import type { TowerUnitGrid } from '@/apps/builder/lib/unit-grid'
import type { Amenity } from '@/lib/api'

export type WizardState = {
  buildingId?: string
  form: BuildingIdentityForm
  towers: TowerDraft[]
  unitGrids: TowerUnitGrid[]
  buildingDefaults: BuildingDefaultsForm
  amenities: Amenity[]
  selectedTowerIndex: number
  selectedFloor: number | null
  description: string
  isDraft: boolean
  generatingDescription: boolean
  generateHint: string | null
  currentStep: number
  maxReachable: number
  loading: boolean
  saving: boolean
  lookingUpCep: boolean
  cepHint: string | null
  error: string | null
}

export type WizardActions = {
  setForm: (form: BuildingIdentityForm) => void
  setTowers: (towers: TowerDraft[]) => void
  setUnitGrids: (grids: TowerUnitGrid[]) => void
  setBuildingDefaults: (defaults: BuildingDefaultsForm) => void
  setSelectedTowerIndex: (index: number) => void
  setSelectedFloor: (floor: number | null) => void
  setDescription: (value: string) => void
  setIsDraft: (value: boolean) => void
  setCurrentStep: (step: number) => void
  lookupCep: () => Promise<void>
  generateDescription: () => Promise<void>
  persistStep: (step: number) => Promise<void>
  submit: (event: FormEvent) => Promise<void>
}

export type WizardMeta = {
  canContinue: boolean
}

export type BuildingWizardContextValue = {
  state: WizardState
  actions: WizardActions
  meta: WizardMeta
}

export const BuildingWizardContext = createContext<BuildingWizardContextValue | null>(null)

export function useBuildingWizard() {
  const value = use(BuildingWizardContext)

  if (!value) {
    throw new Error('useBuildingWizard must be used within BuildingWizard.Provider')
  }

  return value
}
