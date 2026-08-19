import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AmenitiesPage } from '@/apps/admin/AmenitiesPage'
import * as api from '@/lib/api'

describe('AmenitiesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api.adminApi, 'listAmenities').mockResolvedValue([
      { id: 1, slug: 'piscina', name: 'Piscina', active: true },
      { id: 2, slug: 'gerador', name: 'Gerador', active: false },
    ])
  })

  it('lists active and inactive amenities', async () => {
    render(
      <MemoryRouter>
        <AmenitiesPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Piscina')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Gerador')).toBeInTheDocument()
      expect(screen.getByText('piscina')).toBeInTheDocument()
      expect(screen.getByText('Ativo')).toBeInTheDocument()
      expect(screen.getByText('Inativo')).toBeInTheDocument()
    })
  })

  it('creates an amenity and toggles active', async () => {
    const user = userEvent.setup()
    const createSpy = vi.spyOn(api.adminApi, 'createAmenity').mockResolvedValue({
      id: 3,
      slug: 'sauna',
      name: 'Sauna',
      active: true,
    })
    const updateSpy = vi.spyOn(api.adminApi, 'updateAmenity').mockResolvedValue({
      id: 1,
      slug: 'piscina',
      name: 'Piscina',
      active: false,
    })

    render(
      <MemoryRouter>
        <AmenitiesPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Piscina')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Nome'), 'Sauna')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({ name: 'Sauna' })
    })

    await user.click(screen.getAllByRole('button', { name: 'Desativar' })[0])

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(1, { active: false })
    })
  })
})
