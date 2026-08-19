import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuildingMassing } from '@/apps/builder/components/BuildingMassing'

describe('BuildingMassing', () => {
  it('selects a tower floor when clicked', async () => {
    const user = userEvent.setup()
    const onSelectTower = vi.fn()
    const onSelectFloor = vi.fn()

    render(
      <BuildingMassing
        towers={[
          { name: 'Torre A', floorsCount: 3 },
          { name: 'Torre B', floorsCount: 2 },
        ]}
        selectedTowerIndex={0}
        onSelectTower={onSelectTower}
        onSelectFloor={onSelectFloor}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Torre B, andar 2' }))

    expect(onSelectTower).toHaveBeenCalledWith(1)
    expect(onSelectFloor).toHaveBeenCalledWith(1, 2)
  })

  it('renders typical unit labels, legend and totals for the selected tower', () => {
    render(
      <BuildingMassing
        towers={[{ name: 'Torre A', floorsCount: 5, typicalCount: 4 }]}
        selectedTowerIndex={0}
        selectedFloor={5}
        onSelectTower={vi.fn()}
      />,
    )

    expect(screen.getAllByText('01').length).toBeGreaterThan(0)
    expect(screen.getByText('Final 01')).toBeInTheDocument()
    expect(screen.getByText('Áreas comuns')).toBeInTheDocument()
    expect(screen.getByText(/5 andares/)).toBeInTheDocument()
    expect(screen.getByText(/4 unidades por andar/)).toBeInTheDocument()
    expect(screen.getByText(/20 unidades no total/)).toBeInTheDocument()
  })
})
