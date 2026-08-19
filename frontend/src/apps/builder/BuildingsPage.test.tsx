import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingsPage } from '@/apps/builder/BuildingsPage'
import * as api from '@/lib/api'

describe('BuildingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'fetchMe').mockResolvedValue({
      id: 1,
      name: 'Gestor',
      email: 'gestor@test.com',
      role: 'builder',
      tenant_id: 1,
      permissions: ['buildings.view', 'buildings.manage'],
    })
  })

  it('renders building cards with units summary', async () => {
    vi.spyOn(api.builderApi, 'listBuildings').mockResolvedValue([
      {
        id: 1,
        name: 'Residencial Aurora',
        description: null,
        city: 'São Paulo',
        state: 'SP',
        published: true,
        seo_title: null,
        seo_description: null,
        units_summary: {
          total: 4,
          available: 2,
          pre_reserved: 0,
          reserved: 1,
          sold: 1,
          unavailable: 0,
        },
      },
    ])

    render(
      <MemoryRouter>
        <BuildingsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Residencial Aurora')).toBeInTheDocument()
      expect(screen.getByText('4 unidades no total')).toBeInTheDocument()
      expect(screen.getByText(/2 disponível/)).toBeInTheDocument()
    })
  })

  it('sends the header plus button to the create wizard', async () => {
    vi.spyOn(api.builderApi, 'listBuildings').mockResolvedValue([])
    vi.spyOn(api.builderApi, 'createBuilding')

    render(
      <MemoryRouter>
        <BuildingsPage />
      </MemoryRouter>,
    )

    const createLink = await screen.findByRole('link', { name: 'Novo empreendimento' })
    expect(createLink).toHaveAttribute('href', '/buildings/new')
    expect(screen.queryByPlaceholderText('Nome do novo empreendimento')).not.toBeInTheDocument()
    expect(api.builderApi.createBuilding).not.toHaveBeenCalled()
  })

  it('hides the create button without buildings.manage', async () => {
    vi.spyOn(api, 'fetchMe').mockResolvedValue({
      id: 2,
      name: 'Comercial',
      email: 'comercial@test.com',
      role: 'builder',
      tenant_id: 1,
      permissions: ['buildings.view'],
    })
    vi.spyOn(api.builderApi, 'listBuildings').mockResolvedValue([])

    render(
      <MemoryRouter>
        <BuildingsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Nenhum empreendimento cadastrado.')
    expect(screen.queryByRole('link', { name: 'Novo empreendimento' })).not.toBeInTheDocument()
  })
})
