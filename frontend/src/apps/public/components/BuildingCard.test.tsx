import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BuildingCard } from '@/apps/public/components/BuildingCard'
import type { PublicBuildingListItem } from '@/lib/api'

const building: PublicBuildingListItem = {
  id: 1,
  slug: 'aurora',
  name: 'Aurora',
  description: 'Lançamento na zona sul',
  city: 'São Paulo',
  state: 'SP',
  seo_title: null,
  seo_description: null,
  units_count: 12,
  cover_image: null,
  cheapest_unit: {
    code: '101',
    price: '450000.00',
    area_m2: '72.00',
    floor: 1,
  },
}

describe('BuildingCard', () => {
  it('shows the calculated listing price', () => {
    render(<BuildingCard building={building} onSelect={() => {}} />)

    expect(screen.getByText('A partir de')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*450\.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/Unidade 101/)).toBeInTheDocument()
    expect(screen.getByText(/72 m² · 1º andar/)).toBeInTheDocument()
  })

  it('asks to consult when the calculated price is missing', () => {
    render(
      <BuildingCard
        building={{
          ...building,
          cheapest_unit: { ...building.cheapest_unit!, price: null },
        }}
        onSelect={() => {}}
      />,
    )

    expect(screen.getByText('Valor sob consulta')).toBeInTheDocument()
    expect(screen.queryByText('A partir de')).not.toBeInTheDocument()
  })

  it('selects the building by slug', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(<BuildingCard building={building} onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: /Aurora/ }))

    expect(onSelect).toHaveBeenCalledWith('aurora')
  })
})
