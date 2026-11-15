import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()

  return {
    ...actual,
    builderApi: {
      ...actual.builderApi,
      listInccIndices: vi.fn(() => new Promise(() => {})),
    },
  }
})
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
    fireEvent.click(screen.getByRole('combobox', { name: 'Torre de origem' }))
    await user.click(await screen.findByRole('option', { name: 'Torre B' }))

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
    expect(screen.queryByText('Selecione uma unidade no pavimento.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Finalidade do pavimento 1' })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Finalidade' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hall' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Garagem' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clonar pavimento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remover pavimento' })).not.toBeInTheDocument()
    expect(screen.getAllByText('1 pavimento (térreo)').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /2º pavimento/ }))

    expect(actions.setSelectedFloor).toHaveBeenCalledWith(2)
  })

  it('changes the selected floor purpose and type from the side panel', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 1 })
    const { actions } = renderStep({}, towers, { selectedFloor: 2 })

    expect(screen.queryByRole('button', { name: 'Finalidade do pavimento 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tipo do pavimento 2' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Residencial' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Garagem' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apartamento' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cobertura' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Garden' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Comercial' }))

    const next = actions.updateSelectedTower.mock.calls.at(-1)?.[0]
    expect(next.floors.find((item: { number: number }) => item.number === 2).kind).toBe('commercial')
    expect(next.floors.find((item: { number: number }) => item.number === 2).unitType).toBe('store')
  })

  it('offers every residential type on floors above the hall', () => {
    const towers = buildSkeleton({
      ...DEFAULT_SKELETON,
      towerCount: 1,
      floorsAbove: 3,
      basementCount: 0,
      unitsPerFloor: 1,
    })

    renderStep({}, towers, { selectedFloor: 2 })

    const middle = within(screen.getByRole('group', { name: 'Tipo' }))
    expect(middle.getByRole('button', { name: 'Apartamento' })).toBeInTheDocument()
    expect(middle.getByRole('button', { name: 'Cobertura' })).toBeInTheDocument()
    expect(middle.getByRole('button', { name: 'Garden' })).toBeInTheDocument()
    expect(middle.getByRole('button', { name: 'Duplex' })).toBeInTheDocument()
    expect(middle.getByRole('button', { name: 'Triplex' })).toBeInTheDocument()
    expect(middle.getByRole('button', { name: 'Loft' })).toBeInTheDocument()
    expect(middle.getByRole('button', { name: 'Studio' })).toBeInTheDocument()
    expect(middle.getByRole('button', { name: 'Flat' })).toBeInTheDocument()

    cleanup()
    renderStep({}, towers, { selectedFloor: 4 })

    const top = within(screen.getByRole('group', { name: 'Tipo' }))
    expect(top.getByRole('button', { name: 'Cobertura' })).toBeInTheDocument()
    expect(top.getByRole('button', { name: 'Duplex' })).toBeInTheDocument()
  })

  it('locks a floor below the hall as garage and still offers garage above', () => {
    const towers = buildSkeleton({
      ...DEFAULT_SKELETON,
      towerCount: 1,
      floorsAbove: 3,
      basementCount: 1,
      unitsPerFloor: 1,
    })

    renderStep({}, towers, { selectedFloor: 4 })

    const upper = within(screen.getByRole('group', { name: 'Finalidade' }))
    expect(upper.getByRole('button', { name: 'Garagem' })).toBeInTheDocument()
    expect(upper.queryByRole('button', { name: 'Hall' })).not.toBeInTheDocument()

    cleanup()
    renderStep({}, towers, { selectedFloor: -1 })

    const basement = within(screen.getByRole('group', { name: 'Finalidade' }))
    expect(basement.getByText('Garagem')).toBeInTheDocument()
    expect(basement.queryByRole('button', { name: 'Residencial' })).not.toBeInTheDocument()
    expect(basement.queryByRole('button', { name: 'Comercial' })).not.toBeInTheDocument()
    expect(basement.queryByRole('button', { name: 'Hall' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Subsolo 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Garagem').length).toBeGreaterThan(1)
  })

  it('opens unit mini cards under the selected floor', () => {
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 2 })
    const residential = towers[0]?.floors.find((item) => item.number === 2)

    if (!residential) {
      throw new Error('Pavimento residencial ausente')
    }

    residential.units[0].areaM2 = '41.41'
    residential.units[0].priceBase = '445889.98'
    residential.units[0].status = 'available'
    residential.units[1].areaM2 = '38'
    residential.units[1].priceBase = '320000'
    residential.units[1].status = 'sold'

    renderStep({}, towers, { selectedFloor: 2 })

    const open = document.getElementById('floor-units-2')

    expect(open?.parentElement).not.toHaveAttribute('aria-hidden')
    expect(open).toHaveTextContent('201')
    expect(open).toHaveTextContent('R$ 445.889,98')
    expect(open).toHaveTextContent('41,41 m²')
    expect(open).not.toHaveTextContent('Disponível')
    expect(open).toHaveTextContent('202')
    expect(open).toHaveTextContent('R$ 320.000,00')
    expect(open).toHaveTextContent('38,00 m²')
    expect(open).not.toHaveTextContent('Vendido')
    expect(document.getElementById('floor-units-1')?.parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('converts the INCC quantity to reais on the unit card', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 1 })
    const residential = towers[0]?.floors.find((item) => item.number === 2)

    if (!residential) {
      throw new Error('Pavimento residencial ausente')
    }

    residential.units[0].priceBase = '332988'
    residential.units[0].priceCompetence = '2026-02'

    const { builderApi } = await import('@/lib/api')
    vi.mocked(builderApi.listInccIndices).mockResolvedValueOnce([
      { competence: '2026-07-01', value: '1020.500000' },
      { competence: '2026-02-01', value: '1000.000000' },
    ])

    renderStep({}, towers, { selectedFloor: 2 })

    const price = await screen.findByText('R$ 339.814,25')

    expect(price).toHaveAttribute('title', '332.988 INCC')

    await user.hover(price)

    expect(await screen.findByText('332.988 INCC')).toBeInTheDocument()
  })

  it('collapses the floor accordion from its header or when another floor opens', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 1 })
    renderStep({}, towers, { selectedFloor: 2 })

    expect(document.getElementById('floor-units-2')?.parentElement).not.toHaveAttribute('aria-hidden')

    fireEvent.pointerDown(screen.getByRole('heading', { name: 'Mapa de pavimentos' }))

    expect(document.getElementById('floor-units-2')?.parentElement).not.toHaveAttribute('aria-hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Comercial' }))

    expect(document.getElementById('floor-units-2')?.parentElement).not.toHaveAttribute('aria-hidden')

    await user.click(screen.getByRole('button', { name: /2º pavimento/ }))

    expect(document.getElementById('floor-units-2')?.parentElement).toHaveAttribute('aria-hidden', 'true')

    await user.click(screen.getByRole('button', { name: /1 pavimento \(térreo\)/ }))

    expect(document.getElementById('floor-units-1')?.parentElement).not.toHaveAttribute('aria-hidden')
    expect(document.getElementById('floor-units-2')?.parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('opens floor and unit actions from the context menu', async () => {
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 1 })
    renderStep({}, towers, { selectedFloor: 2 })
    const unitCard = document.getElementById('floor-units-2')?.querySelector('button')

    if (!unitCard) {
      throw new Error('Card da unidade ausente')
    }

    fireEvent.contextMenu(screen.getByRole('button', { name: /2º pavimento/ }))

    expect(await screen.findByRole('menuitem', { name: 'Adicionar unidade' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Duplicar pavimento acima' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Remover pavimento' })).toBeInTheDocument()

    const accordion = document.getElementById('floor-units-2')

    if (!accordion) {
      throw new Error('Sanfona do pavimento ausente')
    }

    fireEvent.contextMenu(accordion)

    expect(await screen.findByRole('menuitem', { name: 'Duplicar pavimento abaixo' })).toBeInTheDocument()

    fireEvent.contextMenu(unitCard)

    expect(await screen.findByRole('menuitem', { name: 'Copiar características da unidade' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Colar características' })).toBeInTheDocument()
  })

  it('shows floor details from the row or the accordion body, and unit details from a unit', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({
      ...DEFAULT_SKELETON,
      towerCount: 1,
      floorsAbove: 3,
      basementCount: 1,
      unitsPerFloor: 2,
    })
    const floors = towers[0]?.floors ?? []
    const commercial = floors.find((floor) => floor.number === 3)
    const garage = floors.find((floor) => floor.number === 4)

    if (!commercial || !garage) {
      throw new Error('Pavimentos de exemplo ausentes')
    }

    commercial.kind = 'commercial'
    garage.kind = 'garage'

    renderStep({}, towers, { selectedFloor: 2 })

    expect(screen.getByRole('button', { name: /1 pavimento \(térreo\)/ }).closest('[data-floor-tone]')).toHaveAttribute(
      'data-floor-tone',
      'hall',
    )
    expect(screen.getByRole('button', { name: /2º pavimento/ }).closest('[data-floor-tone]')).toHaveAttribute(
      'data-floor-tone',
      'residential',
    )
    expect(screen.getByText('2 pavimento')).toBeInTheDocument()
    expect(screen.getByText('1 pavimento')).toBeInTheDocument()
    expect(screen.getByText('Subsolo 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /3º pavimento/ }).closest('[data-floor-tone]')).toHaveAttribute(
      'data-floor-tone',
      'commercial',
    )
    expect(screen.getByRole('button', { name: /4º pavimento/ }).closest('[data-floor-tone]')).toHaveAttribute(
      'data-floor-tone',
      'garage',
    )
    expect(screen.getByRole('button', { name: /Subsolo 1/ }).closest('[data-floor-tone]')).toHaveAttribute(
      'data-floor-tone',
      'basement',
    )

    const open = document.getElementById('floor-units-2')

    if (!open) {
      throw new Error('Sanfona do pavimento ausente')
    }

    await user.click(open.querySelector('button') as HTMLButtonElement)

    expect(screen.getByLabelText('Unidade')).toHaveValue('201')
    expect(open.parentElement).not.toHaveAttribute('aria-hidden')

    fireEvent.click(open)

    expect(screen.getByRole('group', { name: 'Finalidade' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Unidade')).not.toBeInTheDocument()
    expect(open.parentElement).not.toHaveAttribute('aria-hidden')

    await user.click(open.querySelector('button') as HTMLButtonElement)
    await user.click(screen.getByRole('button', { name: /2º pavimento/ }))

    expect(screen.getByRole('group', { name: 'Finalidade' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Unidade')).not.toBeInTheDocument()
    expect(open.parentElement).toHaveAttribute('aria-hidden', 'true')
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

    const unitKey = towers[0]?.floors.find((floor) => floor.number === 2)?.units[0]?.key

    expect(screen.getByLabelText('Unidade')).toHaveValue('201')
    expect(screen.getByLabelText('Área privativa')).toBeInTheDocument()
    expect(screen.getByLabelText('Dormitórios')).toBeInTheDocument()
    expect(screen.getByLabelText('Banheiros')).toBeInTheDocument()
    expect(screen.getByLabelText('Suítes')).toBeInTheDocument()
    expect(screen.getByLabelText('Lavabos')).toBeInTheDocument()
    expect(screen.getByLabelText('Valor (INCC)')).toBeInTheDocument()
    expect(screen.getByLabelText('Área privativa').closest('[data-slot="input-group"]')).toHaveTextContent('m²')
    expect(screen.getByLabelText('Valor (INCC)').closest('[data-slot="input-group"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'MAIS' })).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(`unit-more-${unitKey}`)).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('button', { name: 'Remover unidade' })).not.toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: '201' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Banheiros'), 'a2')
    await user.type(screen.getByLabelText('Valor (INCC)'), 'a3')

    expect(actions.updateStackUnit).toHaveBeenCalledWith(unitKey, { bathrooms: '2' })
    expect(actions.updateStackUnit).not.toHaveBeenCalledWith(unitKey, { bathrooms: 'a2' })
    expect(actions.updateStackUnit).toHaveBeenCalledWith(unitKey, { priceBase: '3' })
    expect(actions.updateStackUnit).not.toHaveBeenCalledWith(unitKey, { priceBase: 'a3' })

    await user.type(screen.getByLabelText('Unidade'), 'X')

    expect(actions.updateStackUnit).toHaveBeenCalledWith(unitKey, { code: '201X' })

    await user.click(screen.getByRole('button', { name: 'MAIS' }))

    expect(screen.getByRole('button', { name: 'MAIS' })).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById(`unit-more-${unitKey}`)).not.toHaveAttribute('aria-hidden')
    expect(screen.getByLabelText('Sacadas')).toBeInTheDocument()
    expect(screen.getByLabelText('Posição')).toBeInTheDocument()
    expect(screen.queryByLabelText('Posição 201')).not.toBeInTheDocument()
  })

  it('shows only private area and price for a basement unit', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({
      ...DEFAULT_SKELETON,
      towerCount: 1,
      floorsAbove: 1,
      basementCount: 1,
      unitsPerFloor: 1,
    })
    renderStep({}, towers, { selectedFloor: -1 })
    const open = document.getElementById('floor-units--1')

    if (!open) {
      throw new Error('Sanfona do subsolo ausente')
    }

    await user.click(open.querySelector('button') as HTMLButtonElement)

    expect(screen.getByLabelText('Área privativa')).toBeInTheDocument()
    expect(screen.getByLabelText('Valor (INCC)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Dormitórios')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Banheiros')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'MAIS' })).not.toBeInTheDocument()
  })

  it('copies unit characteristics and pastes them onto another unit', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 2 })
    const residential = towers[0]?.floors.find((floor) => floor.number === 2)

    if (!residential) {
      throw new Error('Pavimento residencial ausente')
    }

    residential.units[0].areaM2 = '41.41'
    residential.units[0].bedrooms = '3'
    const { actions } = renderStep({}, towers, { selectedFloor: 2 })

    fireEvent.click(screen.getByRole('button', { name: 'Ações da unidade 201' }))
    expect(await screen.findByRole('menuitem', { name: 'Colar características' })).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByRole('menuitem', { name: 'Copiar características da unidade' }))

    fireEvent.click(screen.getByRole('button', { name: 'Ações da unidade 202' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Colar características' }))

    expect(actions.updateStackUnit).toHaveBeenCalledWith(
      residential.units[1]?.key,
      expect.objectContaining({ areaM2: '41.41', bedrooms: '3' }),
    )
    const patch = actions.updateStackUnit.mock.calls.at(-1)?.[1] as Record<string, unknown>
    expect(patch).not.toHaveProperty('key')
    expect(patch).not.toHaveProperty('code')
    expect(patch).not.toHaveProperty('status')
  })

  it('duplicates and removes a unit from the card menu', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 2 })
    const { actions } = renderStep({}, towers, { selectedFloor: 2 })

    fireEvent.click(screen.getByRole('button', { name: 'Ações da unidade 201' }))
    expect(await screen.findByRole('separator')).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Duplicar unidade' }))

    const duplicated = actions.updateSelectedTower.mock.calls.at(-1)?.[0]
    expect(duplicated.floors.find((item: { number: number }) => item.number === 2).units).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'Ações do pavimento 2' }))
    expect(await screen.findByRole('menuitem', { name: 'Adicionar unidade' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Duplicar pavimento acima' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Duplicar pavimento abaixo' })).toBeInTheDocument()
    expect(screen.getByRole('separator')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Remover pavimento' })).toBeInTheDocument()
  })

  it('adds a blank unit after the last one from the floor menu', async () => {
    const user = userEvent.setup()
    const towers = buildSkeleton({ ...DEFAULT_SKELETON, towerCount: 1, floorsAbove: 1, unitsPerFloor: 2 })
    const residential = towers[0]?.floors.find((floor) => floor.number === 2)

    if (!residential) {
      throw new Error('Pavimento residencial ausente')
    }

    residential.units[0].areaM2 = '41.41'
    const { actions } = renderStep({}, towers, { selectedFloor: 2 })

    fireEvent.click(screen.getByRole('button', { name: 'Ações do pavimento 2' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Adicionar unidade' }))

    const next = actions.updateSelectedTower.mock.calls.at(-1)?.[0]
    const units = next.floors.find((item: { number: number }) => item.number === 2).units

    expect(units).toHaveLength(3)
    expect(units[0]).toEqual(expect.objectContaining({ code: '201', areaM2: '41.41' }))
    expect(units[1]).toEqual(expect.objectContaining({ code: '202' }))
    expect(units[2]).toEqual(
      expect.objectContaining({
        code: '203',
        areaM2: '',
        bedrooms: '',
        bathrooms: '',
        priceBase: '',
      }),
    )
    expect(actions.setSelectedFloor).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole('button', { name: 'Ações do pavimento 1' }))
    expect(await screen.findByRole('menuitem', { name: 'Adicionar unidade' })).toHaveAttribute('aria-disabled', 'true')
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

  it('adds a floor or a basement from the map column', async () => {
    const user = userEvent.setup()
    renderStep()

    expect(screen.queryByRole('menuitem', { name: 'Esqueleto do prédio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mais opções' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(await screen.findByRole('menuitem', { name: 'Adicionar pavimento' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Adicionar subsolo' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Esqueleto do prédio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Adicionar torre' })).not.toBeInTheDocument()
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
