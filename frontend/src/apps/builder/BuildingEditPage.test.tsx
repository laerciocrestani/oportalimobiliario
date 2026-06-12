import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingEditPage } from '@/apps/builder/BuildingEditPage'
import * as api from '@/lib/api'

describe('BuildingEditPage', () => {
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

  it('renders edit form and gallery with back link', async () => {
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue({
      id: 1,
      name: 'Residencial Aurora',
      description: 'Descrição',
      city: 'São Paulo',
      state: 'SP',
      published: true,
      seo_title: null,
      seo_description: null,
    })
    vi.spyOn(api.builderApi, 'listBuildingMedia').mockResolvedValue([])

    render(
      <MemoryRouter initialEntries={['/buildings/1/edit']}>
        <Routes>
          <Route path="/buildings/:buildingId/edit" element={<BuildingEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Dados do empreendimento')).toBeInTheDocument()
      expect(screen.getByText('Galeria de mídias')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/buildings/1')
      expect(screen.getByDisplayValue('Residencial Aurora')).toBeInTheDocument()
    })
  })
})
