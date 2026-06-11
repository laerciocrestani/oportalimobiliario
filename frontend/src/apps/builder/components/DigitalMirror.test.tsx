import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DigitalMirror } from '@/apps/builder/components/DigitalMirror'
import type { Tower } from '@/lib/api'

const towerA: Tower = {
  id: 1,
  name: 'Torre A',
  sort_order: 0,
  units: [
    { id: 1, code: '1801', floor: 18, area_m2: '90', price: '800000', status: 'available' },
    { id: 2, code: '1201', floor: 12, area_m2: '70', price: '600000', status: 'sold' },
  ],
}

const towerB: Tower = {
  id: 2,
  name: 'Torre B',
  sort_order: 1,
  units: [{ id: 3, code: '1801', floor: 18, area_m2: '80', price: '750000', status: 'reserved' }],
}

describe('DigitalMirror', () => {
  it('renders units grouped by floor for a single tower', () => {
    render(
      <DigitalMirror buildingName="Residencial Aurora" towers={[towerA]} onUnitSelect={() => {}} />,
    )

    expect(screen.getByText('18°')).toBeInTheDocument()
    expect(screen.getByText('12°')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unidade 1801' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unidade 1201' })).toBeInTheDocument()
  })

  it('filters mirror by selected tower', async () => {
    const user = userEvent.setup()

    render(
      <DigitalMirror
        buildingName="Residencial Aurora"
        towers={[towerA, towerB]}
        onUnitSelect={() => {}}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Torre A' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Torre B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unidade 1201' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Torre B' }))

    expect(screen.queryByRole('button', { name: 'Unidade 1201' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unidade 1801' })).toBeInTheDocument()
  })

  it('calls onUnitSelect when a cell is clicked', async () => {
    const user = userEvent.setup()
    const onUnitSelect = vi.fn()

    render(
      <DigitalMirror buildingName="Residencial Aurora" towers={[towerA]} onUnitSelect={onUnitSelect} />,
    )

    await user.click(screen.getByRole('button', { name: 'Unidade 1201' }))

    expect(onUnitSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, code: '1201' }),
    )
  })
})
