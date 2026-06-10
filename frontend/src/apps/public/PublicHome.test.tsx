import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PublicHome } from '@/apps/public/PublicHome'
import * as api from '@/lib/api'

describe('PublicHome', () => {
  it('lists published buildings', async () => {
    vi.spyOn(api.publicApi, 'listBuildings').mockResolvedValue([
      {
        id: 1,
        name: 'Residencial Aurora',
        description: 'Demo',
        city: 'São Paulo',
        state: 'SP',
        published: true,
        seo_title: 'Aurora SP',
        seo_description: 'Lançamento demo',
      },
    ])

    render(<PublicHome />)

    await waitFor(() => {
      expect(screen.getByText('Residencial Aurora')).toBeInTheDocument()
    })
  })

  it('loads detail with SEO on click', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.publicApi, 'listBuildings').mockResolvedValue([
      {
        id: 1,
        name: 'Residencial Aurora',
        description: 'Demo',
        city: 'São Paulo',
        state: 'SP',
        published: true,
        seo_title: 'Aurora SP',
        seo_description: 'Lançamento demo',
      },
    ])
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
