import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingEditForm } from '@/apps/builder/components/BuildingEditForm'
import { builderApi, type Building } from '@/lib/api'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    builderApi: {
      ...actual.builderApi,
      listAmenities: vi.fn(),
      lookupCep: vi.fn(),
      updateBuilding: vi.fn(),
    },
  }
})

const building: Building = {
  id: 1,
  slug: 'residencial-aurora',
  name: 'Residencial Aurora',
  description: 'Descrição',
  zip: '01310100',
  street: 'Avenida Paulista',
  number: '100',
  complement: null,
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  published: true,
  seo_title: null,
  seo_description: null,
  amenities: [{ id: 11, slug: 'piscina', name: 'Piscina', active: true }],
}

describe('BuildingEditForm', () => {
  beforeEach(() => {
    vi.mocked(builderApi.listAmenities).mockResolvedValue([
      { id: 11, slug: 'piscina', name: 'Piscina', active: true },
      { id: 12, slug: 'closet', name: 'Closet', active: true },
    ])
  })

  it('loads address and amenities and saves the wizard fields', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    const updated = { ...building, street: 'Rua Augusta' }

    vi.mocked(builderApi.updateBuilding).mockResolvedValue(updated)

    render(<BuildingEditForm building={building} onSaved={onSaved} />)

    expect(screen.getByLabelText('CEP')).toHaveValue('01310-100')
    expect(screen.getByLabelText('Logradouro')).toHaveValue('Avenida Paulista')

    await waitFor(() => {
      expect(screen.getByLabelText('Piscina')).toBeChecked()
      expect(screen.getByLabelText('Closet')).not.toBeChecked()
    })

    await user.click(screen.getByLabelText('Closet'))
    await user.click(screen.getByRole('button', { name: 'Salvar dados' }))

    expect(builderApi.updateBuilding).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        zip: '01310100',
        street: 'Avenida Paulista',
        amenity_ids: [11, 12],
      }),
    )
    expect(onSaved).toHaveBeenCalledWith(updated)
  })

  it('fills address from CEP lookup', async () => {
    const user = userEvent.setup()

    vi.mocked(builderApi.lookupCep).mockResolvedValue({
      zip: '01310100',
      street: 'Rua Augusta',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      complement: '',
    })

    render(<BuildingEditForm building={{ ...building, street: '', neighborhood: '' }} onSaved={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Buscar CEP' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Logradouro')).toHaveValue('Rua Augusta')
      expect(screen.getByLabelText('Bairro')).toHaveValue('Consolação')
    })
  })
})
