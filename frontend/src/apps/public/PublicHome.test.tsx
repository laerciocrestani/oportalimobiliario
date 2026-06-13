import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PublicHome } from '@/apps/public/PublicHome'
import * as api from '@/lib/api'

const sampleBuilding: api.PublicBuildingListItem = {
  id: 1,
  name: 'Residencial Aurora',
  description: 'Demo',
  city: 'São Paulo',
  state: 'SP',
  seo_title: 'Aurora SP',
  seo_description: 'Lançamento demo',
  units_count: 12,
  cheapest_unit: {
    code: '101',
    price: '400000',
    area_m2: '70',
    floor: 1,
  },
  cover_image: {
    id: 5,
    url: '/public/buildings/1/media/5/file',
  },
}

describe('PublicHome', () => {
  it('renders portal layout with hero, header and footer', async () => {
    vi.spyOn(api.publicApi, 'listBuildings').mockResolvedValue([sampleBuilding])

    render(<PublicHome />)

    await waitFor(() => {
      expect(screen.getByText('Residencial Aurora')).toBeInTheDocument()
    })

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByText('Encontre o imóvel ideal no empreendimento certo')).toBeInTheDocument()
    expect(screen.getByText(/Todos os direitos reservados/)).toBeInTheDocument()
  })

  it('shows formatted cheapest unit price on card', async () => {
    vi.spyOn(api.publicApi, 'listBuildings').mockResolvedValue([sampleBuilding])

    render(<PublicHome />)

    await waitFor(() => {
      expect(screen.getByText(/R\$\s*400\.000,00/)).toBeInTheDocument()
    })

    expect(screen.getByText(/Unidade 101/)).toBeInTheDocument()
    expect(screen.getByText('12 unidades')).toBeInTheDocument()
  })

  it('shows empty state when no buildings are published', async () => {
    vi.spyOn(api.publicApi, 'listBuildings').mockResolvedValue([])

    render(<PublicHome />)

    await waitFor(() => {
      expect(screen.getByText(/Nenhum lançamento publicado/)).toBeInTheDocument()
    })
  })

  it('loads detail with SEO on click', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.publicApi, 'listBuildings').mockResolvedValue([sampleBuilding])
    vi.spyOn(api.publicApi, 'getBuilding').mockResolvedValue({
      id: 1,
      name: 'Residencial Aurora',
      description: 'Descrição completa',
      city: 'São Paulo',
      state: 'SP',
      published: true,
      seo_title: 'Aurora SP',
      seo_description: 'Lançamento demo',
      units: [{ id: 1, code: '101', floor: 1, area_m2: '70', price: '400000', status: 'available' }],
    })

    render(<PublicHome />)

    await user.click(await screen.findByText('Residencial Aurora'))

    await waitFor(() => {
      expect(document.title).toBe('Aurora SP')
      expect(screen.getByText('Descrição completa')).toBeInTheDocument()
      expect(screen.getByText('101')).toBeInTheDocument()
    })
  })
})
