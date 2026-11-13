import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { emptyIdentityForm } from '@/apps/builder/components/BuildingWizardIdentityStep'
import { WizardStructureStep } from '@/apps/builder/components/WizardStructureStep'
import {
  BuildingWizardContext,
  type BuildingWizardContextValue,
  type WizardActions,
} from '@/apps/builder/components/building-wizard-context'
import { buildSkeleton, DEFAULT_MIRROR, DEFAULT_SKELETON } from '@/apps/builder/lib/floor-stack'
import { emptyBuildingDefaults } from '@/apps/builder/lib/unit-spec'

function wizardActions(overrides: Partial<WizardActions> = {}): WizardActions {
  return {
    setForm: vi.fn(),
    setSkeleton: vi.fn(),
    generateSkeleton: vi.fn(),
    startEntranceHall: vi.fn(),
    updateStackUnit: vi.fn(),
    updateSelectedTower: vi.fn(),
    addTower: vi.fn(),
    removeSelectedTower: vi.fn(),
    setMirror: vi.fn(),
    cloneMirror: vi.fn(),
    setSelectedTowerIndex: vi.fn(),
    setSelectedFloor: vi.fn(),
    setDescription: vi.fn(),
    setDefaults: vi.fn(),
    setIsDraft: vi.fn(),
    setCurrentStep: vi.fn(),
    lookupCep: vi.fn(async () => {}),
    generateDescription: vi.fn(async () => {}),
    persistStep: vi.fn(async () => {}),
    submit: vi.fn(async (_event: FormEvent) => {}),
    ...overrides,
  }
}

function renderStep(
  overrides: Partial<BuildingWizardContextValue['actions']> = {},
  towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 2, floorsAbove: 1, unitsPerFloor: 1 }),
) {
  const actions = wizardActions(overrides)
  const value: BuildingWizardContextValue = {
    state: {
      form: { ...emptyIdentityForm, name: 'Aurora' },
      stackTowers: towers,
      skeleton: { ...DEFAULT_SKELETON, towerCount: 1 },
      selectedTowerIndex: 0,
      selectedFloor: 1,
      mirror: { ...DEFAULT_MIRROR },
      description: '',
      defaults: emptyBuildingDefaults(),
      isDraft: true,
      updatingExisting: false,
      generatingDescription: false,
      generateHint: null,
      currentStep: 1,
      maxReachable: 1,
      loading: false,
      saving: false,
      lookingUpCep: false,
      cepHint: null,
      error: null,
    },
    actions,
    meta: { canContinue: true },
  }

  render(
    <BuildingWizardContext value={value}>
      <WizardStructureStep />
    </BuildingWizardContext>,
  )

  return { actions, towers }
}

describe('WizardStructureStep', () => {
  it('shows tower tabs and hides the inline tower form', () => {
    renderStep()

    expect(screen.getByRole('tab', { name: 'Torre A' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Torre B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar torre' })).toBeInTheDocument()
    expect(screen.queryByText('Adicionar torre')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remover torre' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nome da torre')).not.toBeInTheDocument()
  })

  it('selects a tower from its tab', async () => {
    const user = userEvent.setup()
    const { actions } = renderStep()

    await user.click(screen.getByRole('tab', { name: 'Torre B' }))

    expect(actions.setSelectedTowerIndex).toHaveBeenCalledWith(1)
  })

  it('adds a tower with only a name when clone stays off', async () => {
    const user = userEvent.setup()
    const { actions } = renderStep()

    await user.click(screen.getByRole('button', { name: 'Adicionar torre' }))
    expect(screen.getByRole('dialog', { name: 'Nova torre' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Torre de origem' })).not.toBeInTheDocument()

    const name = screen.getByLabelText('Nome da torre')
    await user.clear(name)
    await user.type(name, 'Torre Norte')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(actions.addTower).toHaveBeenCalledWith({ name: 'Torre Norte', sourceKey: null })
  })

  it('clones the selected existing tower when the switch is on', async () => {
    const user = userEvent.setup()
    const { actions, towers } = renderStep()

    await user.click(screen.getByRole('button', { name: 'Adicionar torre' }))
    const toggle = screen.getByRole('switch', { name: 'Clonar dados de torre existente' })
    const checkbox = toggle.parentElement?.querySelector('input[type="checkbox"]')

    if (!(checkbox instanceof HTMLInputElement)) {
      throw new Error('Switch sem input')
    }

    // O switch do Base UI dispara um PointerEvent, que o jsdom não constrói.
    fireEvent.click(checkbox)
    await user.click(screen.getByRole('combobox', { name: 'Torre de origem' }))
    await user.click(screen.getByRole('option', { name: 'Torre B' }))

    const name = screen.getByLabelText('Nome da torre')
    await user.clear(name)
    await user.type(name, 'Torre Cópia')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(actions.addTower).toHaveBeenCalledWith({ name: 'Torre Cópia', sourceKey: towers[1].key })
  })

  it('shows the floor map and selects a pavement', async () => {
    const user = userEvent.setup()
    const { actions } = renderStep()

    expect(screen.getByRole('heading', { name: 'Estrutura' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mapa de pavimentos' })).toBeInTheDocument()
    expect(screen.getByText('Pavimento selecionado')).toBeInTheDocument()
    expect(screen.getAllByText('1º pavimento').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /Térreo/ }))

    expect(actions.setSelectedFloor).toHaveBeenCalledWith(0)
  })

  it('filters the floor map by kind', async () => {
    const user = userEvent.setup()
    renderStep()

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Garagem' }))

    expect(screen.getByRole('button', { name: /Subsolo 1/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Térreo/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /1º pavimento/ })).not.toBeInTheDocument()
  })

  it('starts from an empty structure with skeleton and manual options', async () => {
    const user = userEvent.setup()
    const { actions } = renderStep({}, [])

    expect(screen.getByText('Nenhuma estrutura ainda')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Esqueleto do prédio' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Criar esqueleto do prédio' }))
    expect(screen.getByRole('dialog', { name: 'Esqueleto do prédio' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await user.click(screen.getByRole('button', { name: 'Criar prédio manual' }))
    expect(actions.startEntranceHall).toHaveBeenCalled()
  })
})
