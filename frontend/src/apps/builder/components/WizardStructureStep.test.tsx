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
  state: Partial<BuildingWizardContextValue['state']> = {},
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
      ...state,
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
    expect(screen.queryByText('Pavimento selecionado')).not.toBeInTheDocument()
    expect(screen.getByText('Selecione uma unidade no pavimento.')).toBeInTheDocument()
    expect(screen.getAllByText('1 pavimento (térreo)').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /2º pavimento/ }))

    expect(actions.setSelectedFloor).toHaveBeenCalledWith(2)
  })

  it('opens unit mini cards under the selected floor', () => {
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 2 })
    const residential = towers[0]?.floors.find((item) => item.number === 2)

    if (!residential) {
      throw new Error('Pavimento residencial ausente')
    }

    residential.units[0].areaM2 = '41.41'
    residential.units[0].status = 'available'
    residential.units[1].areaM2 = '38'
    residential.units[1].status = 'sold'

    renderStep({}, towers, { selectedFloor: 2 })

    const open = document.getElementById('floor-units-2')

    expect(open?.parentElement).not.toHaveAttribute('aria-hidden')
    expect(open).toHaveTextContent('201')
    expect(open).toHaveTextContent('41,41 m²')
    expect(open).toHaveTextContent('Disponível')
    expect(open).toHaveTextContent('202')
    expect(open).toHaveTextContent('38,00 m²')
    expect(open).toHaveTextContent('Vendido')
    expect(document.getElementById('floor-units-1')?.parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('collapses the floor accordion from its header or when another floor opens', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 1 })
    renderStep({}, towers, { selectedFloor: 2 })

    expect(document.getElementById('floor-units-2')?.parentElement).not.toHaveAttribute('aria-hidden')

    fireEvent.pointerDown(screen.getByRole('heading', { name: 'Mapa de pavimentos' }))

    expect(document.getElementById('floor-units-2')?.parentElement).not.toHaveAttribute('aria-hidden')

    await user.click(screen.getByRole('button', { name: /2º pavimento/ }))

    expect(document.getElementById('floor-units-2')?.parentElement).toHaveAttribute('aria-hidden', 'true')

    await user.click(screen.getByRole('button', { name: /1 pavimento \(térreo\)/ }))

    expect(document.getElementById('floor-units-1')?.parentElement).not.toHaveAttribute('aria-hidden')
    expect(document.getElementById('floor-units-2')?.parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('edits the unit chosen from the floor accordion', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 1 })
    const { actions } = renderStep({}, towers, { selectedFloor: 2 })
    const open = document.getElementById('floor-units-2')

    if (!open) {
      throw new Error('Sanfona do pavimento ausente')
    }

    await user.click(open.querySelector('button') as HTMLButtonElement)

    expect(screen.getByLabelText('Área privativa 201 (m²)')).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: '201' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Área privativa 201 (m²)'), '5')

    expect(actions.updateStackUnit).toHaveBeenCalled()
  })

  it('duplicates and removes a unit from the card menu', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 2 })
    const { actions } = renderStep({}, towers, { selectedFloor: 2 })

    fireEvent.click(screen.getByRole('button', { name: 'Ações da unidade 201' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Duplicar unidade' }))

    const duplicated = actions.updateSelectedTower.mock.calls.at(-1)?.[0]
    expect(duplicated.floors.find((item: { number: number }) => item.number === 2).units).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'Ações do pavimento 2' }))
    expect(await screen.findByRole('menuitem', { name: 'Duplicar pavimento acima' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Duplicar pavimento abaixo' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Remover pavimento' })).toBeInTheDocument()
  })

  it('confirms before removing a unit or a floor', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 2 })
    const { actions } = renderStep({}, towers, { selectedFloor: 2 })

    fireEvent.click(screen.getByRole('button', { name: 'Ações da unidade 201' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Remover unidade' }))

    expect(screen.getByRole('dialog', { name: 'Remover unidade 201?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(actions.updateSelectedTower).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Ações do pavimento 2' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Remover pavimento' }))
    expect(screen.getByRole('dialog', { name: 'Remover 2º pavimento?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remover' }))

    expect(actions.updateSelectedTower).toHaveBeenCalled()
    expect(actions.setSelectedFloor).toHaveBeenCalled()
  })

  it('filters the floor map by kind', async () => {
    const user = userEvent.setup()
    renderStep()

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Garagem' }))

    expect(screen.getByRole('button', { name: /Subsolo 1/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /1 pavimento \(térreo\)/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /2º pavimento/ })).not.toBeInTheDocument()
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
