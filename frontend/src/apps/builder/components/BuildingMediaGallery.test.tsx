import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingMediaGallery } from '@/apps/builder/components/BuildingMediaGallery'
import * as api from '@/lib/api'

describe('BuildingMediaGallery', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api.builderApi, 'listBuildingMedia').mockResolvedValue([
      {
        id: 1,
        building_id: 1,
        category: 'internal',
        original_name: 'interna.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 1000,
        published: false,
        sort_order: 0,
        url: '/builder/buildings/1/media/1/file',
      },
      {
        id: 2,
        building_id: 1,
        category: 'floor_plan',
        original_name: 'planta.pdf',
        mime_type: 'application/pdf',
        size_bytes: 2000,
        published: false,
        sort_order: 0,
        url: '/builder/buildings/1/media/2/file',
      },
    ])
    vi.spyOn(api.builderApi, 'fetchBuildingMediaBlob').mockResolvedValue(new Blob(['x']))
  })

  it('shows publish toggle for internal images and not for floor plans', async () => {
    render(<BuildingMediaGallery buildingId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Publicar no portal')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('tab', { name: 'Plantas' }))

    await waitFor(() => {
      expect(screen.queryByText('Publicar no portal')).not.toBeInTheDocument()
      expect(screen.getByText('Restrito à construtora e corretor')).toBeInTheDocument()
      expect(screen.getByText('planta.pdf')).toBeInTheDocument()
    })
  })

  it('accepts pdf upload on floor plans tab', async () => {
    render(<BuildingMediaGallery buildingId={1} />)

    await userEvent.click(screen.getByRole('tab', { name: 'Plantas' }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Enviar plantas (imagem ou PDF)' }),
      ).toBeInTheDocument()
    })
  })
})
