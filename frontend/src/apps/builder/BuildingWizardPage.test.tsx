import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingWizardPage } from '@/apps/builder/BuildingWizardPage'
import * as api from '@/lib/api'
import type { Building } from '@/lib/api'

function draftBuilding(overrides: Partial<Building> = {}): Building {
  return {
    id: 10,
    slug: 'residencial-aurora',
    name: 'Residencial Aurora',
    description: null,
    zip: '01310100',
    street: 'Avenida Paulista',
    number: '1000',
    complement: null,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    published: false,
    wizard_step: 1,
    wizard_completed_at: null,
    seo_title: null,
    seo_description: null,
    towers: [],
    ...overrides,
  }
}

function renderWizard(path = '/buildings/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/buildings/new" element={<BuildingWizardPage />} />
        <Route path="/buildings/:buildingId/wizard" element={<BuildingWizardPage />} />
        <Route path="/buildings/:buildingId" element={<p>Detalhe do empreendimento</p>} />
        <Route path="/buildings" element={<p>Lista de empreendimentos</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BuildingWizardPage', () => {
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
    vi.spyOn(api.builderApi, 'listBuildingMedia').mockResolvedValue([])
    vi.spyOn(api.builderApi, 'listAmenities').mockResolvedValue([])
  })

  it('creates a draft with name and address and advances to towers', async () => {
    const user = userEvent.setup()
    const draft = draftBuilding()
    vi.spyOn(api.builderApi, 'createBuilding').mockResolvedValue(draft)
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(draft)

    renderWizard()

    await user.type(screen.getByLabelText('Nome do empreendimento'), 'Residencial Aurora')
    await user.type(screen.getByLabelText('CEP'), '01310100')
    await user.type(screen.getByLabelText('Logradouro'), 'Avenida Paulista')
    await user.type(screen.getByLabelText('Número'), '1000')
    await user.type(screen.getByLabelText('Bairro'), 'Bela Vista')
    await user.type(screen.getByLabelText('Cidade'), 'São Paulo')
    await user.type(screen.getByLabelText('UF'), 'SP')
    await user.click(screen.getByRole('button', { name: 'Salvar e continuar' }))

    await waitFor(() => {
      expect(api.builderApi.createBuilding).toHaveBeenCalledWith({
        name: 'Residencial Aurora',
        zip: '01310100',
        street: 'Avenida Paulista',
        number: '1000',
        complement: null,
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        published: false,
        wizard_step: 1,
      })
      expect(screen.getByRole('heading', { name: 'Torres e andares' })).toBeInTheDocument()
    })
  })

  it('opens the towers step when resuming a draft after identity', async () => {
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(draftBuilding({ wizard_step: 1 }))

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Torres e andares' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome da torre')).toHaveValue('Torre A')
  })

  it('saves towers and opens the units step for each tower', async () => {
    const user = userEvent.setup()
    const towerA = {
      id: 1,
      name: 'Torre A',
      sort_order: 0,
      floors_count: 2,
      floors: [
        { id: 1, tower_id: 1, number: 1, kind: 'residential' as const },
        { id: 2, tower_id: 1, number: 2, kind: 'residential' as const },
      ],
    }
    const towerB = {
      id: 2,
      name: 'Torre B',
      sort_order: 1,
      floors_count: 1,
      floors: [{ id: 3, tower_id: 2, number: 1, kind: 'residential' as const }],
    }

    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(
      draftBuilding({
        wizard_step: 1,
        towers: [towerA],
      }),
    )
    vi.spyOn(api.builderApi, 'replaceBuildingStructure').mockResolvedValue(
      draftBuilding({
        wizard_step: 2,
        towers: [towerA, towerB],
      }),
    )

    renderWizard('/buildings/10/wizard')

    await screen.findByRole('heading', { name: 'Torres e andares' })
    await user.click(screen.getByRole('button', { name: 'Adicionar torre' }))
    await user.click(screen.getByRole('button', { name: 'Salvar e continuar' }))

    await waitFor(() => {
      expect(api.builderApi.replaceBuildingStructure).toHaveBeenCalledWith(10, {
        towers: [
          { name: 'Torre A', floors_count: 2 },
          { name: 'Torre B', floors_count: 1 },
        ],
      })
      expect(screen.getByRole('heading', { name: 'Unidades' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Torre A' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Torre B' })).toBeInTheDocument()
      expect(screen.getByLabelText('Unidade 1')).toHaveValue('101')
    })

    await user.click(screen.getByRole('button', { name: 'Torre B' }))
    expect(screen.getByText('Torre B — andar 1')).toBeInTheDocument()
  })

  it('replicates typical area to 101 and 201', async () => {
    const user = userEvent.setup()
    const towerA = {
      id: 1,
      name: 'Torre A',
      sort_order: 0,
      floors_count: 2,
      floors: [
        { id: 1, tower_id: 1, number: 1, kind: 'residential' as const },
        { id: 2, tower_id: 1, number: 2, kind: 'residential' as const },
      ],
    }

    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(
      draftBuilding({
        wizard_step: 2,
        towers: [towerA],
      }),
    )

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Unidades' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Área da posição 1 (m²)'), '72')

    expect(screen.getByLabelText('Área da unidade 101 (m²)')).toHaveValue('72')
    await user.click(screen.getByRole('button', { name: 'Torre A, andar 2' }))
    expect(screen.getByLabelText('Área da unidade 201 (m²)')).toHaveValue('72')
  })

  it('saves the unit grid of the selected tower', async () => {
    const user = userEvent.setup()
    const towerA = {
      id: 1,
      name: 'Torre A',
      sort_order: 0,
      floors_count: 1,
      floors: [{ id: 1, tower_id: 1, number: 1, kind: 'residential' as const }],
    }

    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(
      draftBuilding({
        wizard_step: 2,
        towers: [towerA],
      }),
    )
    vi.spyOn(api.builderApi, 'replaceBuildingUnitGrid').mockResolvedValue(
      draftBuilding({ wizard_step: 3, towers: [towerA] }),
    )
    vi.spyOn(api.builderApi, 'updateBuilding').mockResolvedValue(
      draftBuilding({ wizard_step: 3, towers: [towerA] }),
    )

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Unidades' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Remover' })[0])
    await user.click(screen.getByRole('button', { name: 'Salvar e continuar' }))

    await waitFor(() => {
      expect(api.builderApi.updateBuilding).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          published: false,
          wizard_step: 3,
          amenity_ids: [],
        }),
      )
      expect(api.builderApi.replaceBuildingUnitGrid).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          towers: [
            expect.objectContaining({
              id: 1,
              floors: [
                expect.objectContaining({
                  number: 1,
                  kind: 'residential',
                  units: [
                    expect.objectContaining({ code: '101', area_m2: null, bedrooms: null }),
                    expect.objectContaining({ code: '102', area_m2: null }),
                    expect.objectContaining({ code: '103', area_m2: null }),
                  ],
                }),
              ],
            }),
          ],
        }),
      )
      expect(screen.getByRole('heading', { name: 'Mídia' })).toBeInTheDocument()
    })
  })

  it('saves building defaults, amenities and the selected unit spec sheet', async () => {
    const user = userEvent.setup()
    const towerA = {
      id: 1,
      name: 'Torre A',
      sort_order: 0,
      floors_count: 1,
      floors: [{ id: 1, tower_id: 1, number: 1, kind: 'residential' as const }],
    }
    const piscina = { id: 11, slug: 'piscina', name: 'Piscina', active: true }
    const closet = { id: 12, slug: 'closet', name: 'Closet', active: true }

    vi.spyOn(api.builderApi, 'listAmenities').mockResolvedValue([piscina, closet])
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(
      draftBuilding({
        wizard_step: 2,
        ceiling_type: 'plaster',
        towers: [towerA],
      }),
    )
    vi.spyOn(api.builderApi, 'updateBuilding').mockResolvedValue(
      draftBuilding({ wizard_step: 3, towers: [towerA], amenities: [piscina] }),
    )
    vi.spyOn(api.builderApi, 'replaceBuildingUnitGrid').mockResolvedValue(
      draftBuilding({ wizard_step: 3, towers: [towerA] }),
    )

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Padrão do empreendimento' })).toBeInTheDocument()
    expect(await screen.findByRole('checkbox', { name: 'Piscina' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Piscina' }))
    await user.type(screen.getByLabelText('Quartos'), '2')
    expect(screen.getByText(/Herdar do empreendimento \(Gesso\)/)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Extra: Closet' }))
    await user.click(screen.getByRole('button', { name: 'Salvar e continuar' }))

    await waitFor(() => {
      expect(api.builderApi.updateBuilding).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          ceiling_type: 'plaster',
          amenity_ids: [11],
        }),
      )
      const gridPayload = vi.mocked(api.builderApi.replaceBuildingUnitGrid).mock.calls[0][1]
      expect(gridPayload.towers[0].floors[0].units[0]).toEqual(
        expect.objectContaining({
          code: '101',
          bedrooms: 2,
          amenity_ids: [12],
          ceiling_type: null,
        }),
      )
    })
  })

  it('fills the description from the IA generator', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(draftBuilding({ wizard_step: 3 }))
    vi.spyOn(api.builderApi, 'generateBuildingDescription').mockResolvedValue({
      description: 'Residencial Aurora no centro de São Paulo.',
    })

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Mídia' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Plantas' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Gerar descrição com IA' }))

    await waitFor(() => {
      expect(api.builderApi.generateBuildingDescription).toHaveBeenCalledWith(10)
      expect(screen.getByLabelText('Descritivo')).toHaveValue(
        'Residencial Aurora no centro de São Paulo.',
      )
    })
  })

  it('saves the media step as an unpublished draft', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(
      draftBuilding({ wizard_step: 3, description: 'Texto inicial.' }),
    )
    vi.spyOn(api.builderApi, 'updateBuilding').mockResolvedValue(
      draftBuilding({ wizard_step: 4, description: 'Texto inicial.', published: false }),
    )

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Mídia' })).toBeInTheDocument()
    expect(screen.getByLabelText('Descritivo')).toHaveValue('Texto inicial.')
    expect(screen.getByRole('checkbox', { name: 'Rascunho' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }))

    await waitFor(() => {
      expect(api.builderApi.updateBuilding).toHaveBeenCalledWith(10, {
        description: 'Texto inicial.',
        published: false,
        wizard_step: 4,
      })
      expect(screen.getByText('Lista de empreendimentos')).toBeInTheDocument()
    })
  })

  it('publishes when the draft switch is turned off', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(draftBuilding({ wizard_step: 3 }))
    vi.spyOn(api.builderApi, 'updateBuilding').mockResolvedValue(
      draftBuilding({ wizard_step: 4, published: true, description: null }),
    )

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Mídia' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Rascunho' }))
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    await waitFor(() => {
      expect(api.builderApi.updateBuilding).toHaveBeenCalledWith(10, {
        description: null,
        published: true,
        wizard_step: 4,
      })
      expect(screen.getByText('Detalhe do empreendimento')).toBeInTheDocument()
    })
  })

  it('shows an error when publishing without unit prices', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(draftBuilding({ wizard_step: 3 }))
    vi.spyOn(api.builderApi, 'updateBuilding').mockRejectedValue(
      new api.ApiRequestError('Cannot publish while available units have no price.', 422, {
        published: ['Cannot publish while available units have no price.'],
      }),
    )

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Mídia' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Rascunho' }))
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(
      await screen.findByText('Não é possível publicar: unidades à venda precisam ter preço.'),
    ).toBeInTheDocument()
  })

  it('fills address from cep lookup', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.builderApi, 'lookupCep').mockResolvedValue({
      zip: '01310100',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: '',
    })

    renderWizard()

    await user.type(screen.getByLabelText('CEP'), '01310100')
    await user.click(screen.getByRole('button', { name: 'Buscar CEP' }))

    await waitFor(() => {
      expect(api.builderApi.lookupCep).toHaveBeenCalledWith('01310100')
      expect(screen.getByLabelText('Logradouro')).toHaveValue('Avenida Paulista')
      expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo')
      expect(screen.getByLabelText('UF')).toHaveValue('SP')
    })
  })
})
