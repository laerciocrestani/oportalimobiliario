import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StructureEditor } from '@/apps/builder/components/StructureEditor'
import {
  buildSkeleton,
  cloneMirror,
  DEFAULT_MIRROR,
  DEFAULT_SKELETON,
  mirrorDraftFromTower,
  updateFloorUnit,
  type MirrorDraft,
  type SkeletonInput,
  type StackTower,
  type StackUnit,
} from '@/apps/builder/lib/floor-stack'

function StructureEditorHarness({ initialTowers = [] }: { initialTowers?: StackTower[] }) {
  const [towers, setTowers] = useState<StackTower[]>(initialTowers)
  const [selectedTowerIndex, setSelectedTowerIndex] = useState(0)
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<number | null>(
    initialTowers[0]?.floors.find((floor) => floor.number === 1)?.number ??
      initialTowers[0]?.floors[0]?.number ??
      null,
  )
  const [skeleton, setSkeleton] = useState<SkeletonInput>({
    ...DEFAULT_SKELETON,
    floorsAbove: 3,
    basementCount: 1,
    unitsPerFloor: 2,
    spotsPerBasement: 2,
  })
  const [mirror, setMirror] = useState<MirrorDraft>(
    initialTowers[0] ? mirrorDraftFromTower(initialTowers[0]) : { ...DEFAULT_MIRROR },
  )
  const selectedTower = towers[selectedTowerIndex] ?? towers[0] ?? null
  const selectedFloor =
    selectedTower?.floors.find((floor) => floor.number === selectedFloorNumber) ?? null

  return (
    <StructureEditor.Provider
      state={{ towers, selectedTowerIndex, selectedFloorNumber, skeleton, mirror }}
      actions={{
        setSkeleton: (patch) => setSkeleton((current) => ({ ...current, ...patch })),
        generateSkeleton: () => {
          const input = { ...skeleton, unitsPerFloor: 1, spotsPerBasement: 1 }
          setSkeleton(input)
          const next = buildSkeleton(input)
          setTowers(next)
          setSelectedTowerIndex(0)
          setSelectedFloorNumber(next[0]?.floors.find((floor) => floor.kind === 'residential')?.number ?? next[0]?.floors[0]?.number ?? null)
          setMirror(mirrorDraftFromTower(next[0]))
        },
        selectTower: (index) => {
          setSelectedTowerIndex(index)
          setMirror(mirrorDraftFromTower(towers[index]))
        },
        selectFloor: setSelectedFloorNumber,
        updateUnit: (unitKey: string, patch: Partial<StackUnit>) => {
          setTowers((current) =>
            current.map((tower, index) =>
              index === selectedTowerIndex && selectedFloorNumber != null
                ? updateFloorUnit(tower, selectedFloorNumber, unitKey, patch)
                : tower,
            ),
          )
        },
        updateTower: (tower) => {
          setTowers((current) =>
            current.map((item, index) => (index === selectedTowerIndex ? tower : item)),
          )
        },
        setMirror: (patch) => setMirror((current) => ({ ...current, ...patch })),
        cloneMirror: () => {
          setTowers((current) =>
            current.map((tower, index) =>
              index === selectedTowerIndex
                ? cloneMirror(tower, mirror.referenceNumber, mirror)
                : tower,
            ),
          )
        },
      }}
      meta={{ selectedTower, selectedFloor }}
    >
      <StructureEditor.Skeleton />
      <StructureEditor.TowerTabs />
      <StructureEditor.MirrorPanel />
      <StructureEditor.FloorWorkspace />
    </StructureEditor.Provider>
  )
}

describe('StructureEditor', () => {
  it('generates a floor stack from the skeleton questions', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Esqueleto do prédio' }))

    expect(screen.getByLabelText('Qtd pavimentos')).toHaveValue(3)
    expect(screen.getByLabelText('Qtd subsolos')).toHaveValue(1)
    expect(screen.queryByLabelText('Unidades por andar')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Vagas por subsolo')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))

    expect(screen.getByRole('tab', { name: 'Torre A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /4º pavimento/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /3º pavimento/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2º pavimento/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1 pavimento \(térreo\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Subsolo 1/ })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '201' })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: '202' })).not.toBeInTheDocument()
    expect(screen.getByText(/Residencial · 1 unidade/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('edits the selected floor unit', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Esqueleto do prédio' }))
    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: /2º pavimento/ }))
    await user.type(screen.getByLabelText('Área privativa 201 (m²)'), '50')
    await user.type(screen.getByLabelText('Dormitórios 201'), '2')

    expect(screen.getByLabelText('Área privativa 201 (m²)')).toHaveValue('50')
    expect(screen.getByLabelText('Dormitórios 201')).toHaveValue('2')
  })

  it('opens the remaining unit fields in the row', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Esqueleto do prédio' }))
    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: /2º pavimento/ }))

    expect(screen.queryByLabelText('Banheiros 201')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Detalhes 201' }))
    await user.type(screen.getByLabelText('Banheiros 201'), '2')

    expect(screen.getByLabelText('Banheiros 201')).toHaveValue('2')
    expect(screen.getByRole('button', { name: 'Ocultar 201' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('marks the edited floor as an exception', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Esqueleto do prédio' }))
    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: /2º pavimento/ }))
    await user.type(screen.getByLabelText('Área privativa 201 (m²)'), '61')

    expect(screen.getByText(/Residencial · 1 unidade · exceção/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3º pavimento' })).not.toHaveTextContent('Exceção')
  })

  it('clones the mirror floor without overwriting exceptions', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Esqueleto do prédio' }))
    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: /2º pavimento/ }))
    await user.type(screen.getByLabelText('Área privativa 201 (m²)'), '50')

    await user.click(screen.getByRole('button', { name: /3º pavimento/ }))
    await user.type(screen.getByLabelText('Área privativa 301 (m²)'), '61')

    await user.click(screen.getByRole('button', { name: /^Clonar$/ }))

    expect(screen.getByText(/Residencial · 1 unidade · exceção/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4º pavimento' })).not.toHaveTextContent('Exceção')
    expect(screen.getByLabelText('Área privativa 301 (m²)')).toHaveValue('61')

    await user.click(screen.getByRole('button', { name: /4º pavimento/ }))
    expect(screen.getByLabelText('Área privativa 401 (m²)')).toHaveValue('50')
  })

  it('edits a garage floor unit like any other unit', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Esqueleto do prédio' }))
    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: /Subsolo 1/ }))

    expect(screen.getByText(/Garagem · 1 unidade/)).toBeInTheDocument()
    expect(screen.getByLabelText('Dormitórios S1-01')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Área privativa S1-01 (m²)'), '12.5')
    await user.type(screen.getByLabelText('Dormitórios S1-01'), '1')
    await user.type(screen.getByLabelText('Valor-base INCC S1-01'), '45000')

    expect(screen.getByLabelText('Área privativa S1-01 (m²)')).toHaveValue('12.5')
    expect(screen.getByLabelText('Dormitórios S1-01')).toHaveValue('1')
    expect(screen.getByLabelText('Valor-base INCC S1-01')).toHaveValue('45000')
    expect(screen.getByText(/Garagem · 1 unidade · exceção/)).toBeInTheDocument()
  })

  it('selects another tower and floor in the stack', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Esqueleto do prédio' }))
    await user.clear(screen.getByLabelText('Torres'))
    await user.type(screen.getByLabelText('Torres'), '2')
    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('tab', { name: 'Torre B' }))
    await user.click(screen.getByRole('button', { name: /2º pavimento/ }))

    expect(screen.getByRole('tab', { name: 'Torre B' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('cell', { name: '201' })).toBeInTheDocument()
  })
})
