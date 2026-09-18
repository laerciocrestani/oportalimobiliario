import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StructureEditor } from '@/apps/builder/components/StructureEditor'
import {
  buildSkeleton,
  DEFAULT_SKELETON,
  updateFloorUnit,
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
    floorsAbove: 2,
    basementCount: 1,
    unitsPerFloor: 2,
    spotsPerBasement: 2,
  })
  const selectedTower = towers[selectedTowerIndex] ?? towers[0] ?? null
  const selectedFloor =
    selectedTower?.floors.find((floor) => floor.number === selectedFloorNumber) ?? null

  return (
    <StructureEditor.Provider
      state={{ towers, selectedTowerIndex, selectedFloorNumber, skeleton }}
      actions={{
        setSkeleton: (patch) => setSkeleton((current) => ({ ...current, ...patch })),
        generateSkeleton: () => {
          const next = buildSkeleton(skeleton)
          setTowers(next)
          setSelectedTowerIndex(0)
          setSelectedFloorNumber(next[0]?.floors.find((floor) => floor.number === 1)?.number ?? 0)
        },
        selectTower: setSelectedTowerIndex,
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
      }}
      meta={{ selectedTower, selectedFloor }}
    >
      <StructureEditor.Skeleton />
      <StructureEditor.TowerTabs />
      <StructureEditor.FloorStack />
      <StructureEditor.UnitEditor />
    </StructureEditor.Provider>
  )
}

describe('StructureEditor', () => {
  it('generates a floor stack from the skeleton questions', async () => {
    const user = userEvent.setup()
    render(<StructureEditorHarness />)

    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))

    expect(screen.getByRole('tab', { name: 'Torre A' })).toBeInTheDocument()
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
})
