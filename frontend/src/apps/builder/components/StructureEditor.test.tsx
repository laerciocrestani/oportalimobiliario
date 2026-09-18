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
          const next = buildSkeleton(skeleton)
          setTowers(next)
          setSelectedTowerIndex(0)
          setSelectedFloorNumber(next[0]?.floors.find((floor) => floor.number === 1)?.number ?? 0)
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
      <StructureEditor.FloorStack />
      <StructureEditor.UnitEditor />
      <StructureEditor.GaragePanel />
    </StructureEditor.Provider>
  )
}

describe('StructureEditor', () => {
  it('generates a floor stack from the skeleton questions', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))

    expect(screen.getByRole('tab', { name: 'Torre A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Andar 3/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Andar 2/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Andar 1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Térreo/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Subsolo 1/ })).toBeInTheDocument()
    expect(screen.getByDisplayValue('101')).toBeInTheDocument()
  })

  it('edits the selected floor unit', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: /Andar 1/ }))
    await user.type(screen.getByLabelText('Área privativa 101 (m²)'), '50')
    await user.type(screen.getByLabelText('Quartos 101'), '2')

    expect(screen.getByLabelText('Área privativa 101 (m²)')).toHaveValue('50')
    expect(screen.getByLabelText('Quartos 101')).toHaveValue('2')
  })

  it('marks the edited floor as an exception', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: /Andar 1/ }))
    await user.type(screen.getByLabelText('Área privativa 101 (m²)'), '61')

    expect(screen.getByRole('button', { name: /Andar 1/ })).toHaveTextContent('Exceção')
    expect(screen.getByRole('button', { name: /Andar 2/ })).not.toHaveTextContent('Exceção')
  })

  it('clones the mirror floor without overwriting exceptions', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: /Andar 1/ }))
    await user.type(screen.getByLabelText('Área privativa 101 (m²)'), '50')

    await user.click(screen.getByRole('button', { name: /Andar 2/ }))
    await user.type(screen.getByLabelText('Área privativa 201 (m²)'), '61')

    await user.click(screen.getByRole('button', { name: 'Clonar' }))

    expect(screen.getByRole('button', { name: /Andar 2/ })).toHaveTextContent('Exceção')
    expect(screen.getByRole('button', { name: /Andar 3/ })).not.toHaveTextContent('Exceção')
    expect(screen.getByLabelText('Área privativa 201 (m²)')).toHaveValue('61')

    await user.click(screen.getByRole('button', { name: /Andar 3/ }))
    expect(screen.getByLabelText('Área privativa 301 (m²)')).toHaveValue('50')
  })

  it('edits garage spot area and price without living fields', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: /Subsolo 1/ }))

    expect(screen.getByText('Vagas · Subsolo 1')).toBeInTheDocument()
    expect(screen.queryByLabelText('Quartos S1-01')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Área privativa S1-01 (m²)')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Área S1-01 (m²)'), '12.5')
    await user.type(screen.getByLabelText('Preço-base S1-01'), '45000')

    expect(screen.getByLabelText('Área S1-01 (m²)')).toHaveValue('12.5')
    expect(screen.getByLabelText('Preço-base S1-01')).toHaveValue('45000')
    expect(screen.getByRole('button', { name: /Subsolo 1/ })).toHaveTextContent('Exceção')
  })
})
