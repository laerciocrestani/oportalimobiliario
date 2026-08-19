import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PublicUnitList } from '@/apps/public/components/PublicUnitList'
import type { Unit } from '@/lib/api'

const units: Unit[] = [
  {
    id: 1,
    code: '101',
    floor: 1,
    area_m2: '72.00',
    bedrooms: 2,
    bathrooms: 1,
    price: '459225.00',
    status: 'available',
    amenities: [
      { id: 1, slug: 'piscina', name: 'Piscina', active: true },
      { id: 2, slug: 'academia', name: 'Academia', active: true },
    ],
  },
  {
    id: 2,
    code: '102',
    floor: 1,
    area_m2: '80.00',
    bedrooms: 3,
    bathrooms: 2,
    price: null,
    status: 'available',
  },
]

describe('PublicUnitList', () => {
  it('shows the calculated price and a useful spec subset', () => {
    render(<PublicUnitList units={units} />)

    expect(screen.getByText('101')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*459\.225,00/)).toBeInTheDocument()
    expect(screen.getByText('72 m² · 2 quartos · 1 banheiro · 1º andar')).toBeInTheDocument()
    expect(screen.getByText('Piscina, Academia')).toBeInTheDocument()
  })

  it('does not present the base price when the calculated value is missing', () => {
    render(<PublicUnitList units={units} />)

    expect(screen.getByText('Valor sob consulta')).toBeInTheDocument()
    expect(screen.queryByText(/80\.00/)).not.toBeInTheDocument()
  })
})
