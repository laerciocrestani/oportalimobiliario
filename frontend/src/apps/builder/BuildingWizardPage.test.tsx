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

  it('shows three wizard steps', async () => {
    renderWizard()

    expect(await screen.findByRole('button', { name: '1. Identidade' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2. Estrutura' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3. Mídia' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /4\./ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '2. Torres' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '3. Unidades' })).not.toBeInTheDocument()
  })

  it('creates a draft with name and address and advances to structure', async () => {
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
      expect(screen.getByRole('heading', { name: 'Estrutura' })).toBeInTheDocument()
    })
  })

  it('opens the structure step when resuming a draft after identity', async () => {
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(draftBuilding({ wizard_step: 1 }))

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Estrutura' })).toBeInTheDocument()
    expect(screen.getByText('Continuar cadastro')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gerar esqueleto' })).toBeInTheDocument()
  })

  it('saves structure and opens the media step', async () => {
    const user = userEvent.setup()
    const towerA = {
      id: 1,
      name: 'Torre A',
      sort_order: 0,
      floors_count: 1,
      reference_floor: 1,
      floors: [
        { id: 10, tower_id: 1, number: 0, kind: 'commercial' as const, customized: false },
        { id: 11, tower_id: 1, number: 1, kind: 'residential' as const, customized: false },
      ],
    }

    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(
      draftBuilding({
        wizard_step: 1,
        towers: [],
      }),
    )
    vi.spyOn(api.builderApi, 'replaceBuildingStructure').mockResolvedValue(
      draftBuilding({
        wizard_step: 2,
        towers: [towerA],
      }),
    )
    vi.spyOn(api.builderApi, 'replaceBuildingUnitGrid').mockResolvedValue(
      draftBuilding({ wizard_step: 3, towers: [towerA] }),
    )

    renderWizard('/buildings/10/wizard')

    await screen.findByRole('heading', { name: 'Estrutura' })
    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: 'Salvar e continuar' }))

    await waitFor(() => {
      expect(api.builderApi.replaceBuildingStructure).toHaveBeenCalledWith(10, {
        towers: [
          {
            name: 'Torre A',
            reference_floor: 1,
            floors: [
              { number: 0, kind: 'commercial' },
              { number: 1, kind: 'residential' },
            ],
          },
        ],
      })
      expect(api.builderApi.replaceBuildingUnitGrid).toHaveBeenCalled()
      expect(screen.getByRole('heading', { name: 'Mídia' })).toBeInTheDocument()
    })
  })

  it('saves the unit grid of the generated tower', async () => {
    const user = userEvent.setup()
    const towerA = {
      id: 1,
      name: 'Torre A',
      sort_order: 0,
      floors_count: 1,
      reference_floor: 1,
      floors: [
        { id: 10, tower_id: 1, number: 0, kind: 'commercial' as const, customized: false },
        { id: 11, tower_id: 1, number: 1, kind: 'residential' as const, customized: false },
      ],
    }

    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(
      draftBuilding({
        wizard_step: 2,
        towers: [],
      }),
    )
    vi.spyOn(api.builderApi, 'replaceBuildingStructure').mockResolvedValue(
      draftBuilding({ wizard_step: 2, towers: [towerA] }),
    )
    vi.spyOn(api.builderApi, 'replaceBuildingUnitGrid').mockResolvedValue(
      draftBuilding({ wizard_step: 3, towers: [towerA] }),
    )

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Estrutura' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Gerar esqueleto' }))
    await user.click(screen.getByRole('button', { name: 'Salvar e continuar' }))

    await waitFor(() => {
      expect(api.builderApi.replaceBuildingUnitGrid).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          towers: [
            expect.objectContaining({
              id: 1,
              floors: [
                expect.objectContaining({
                  number: 0,
                  kind: 'commercial',
                  units: expect.arrayContaining([expect.objectContaining({ code: 'L01' })]),
                }),
                expect.objectContaining({
                  number: 1,
                  kind: 'residential',
                  units: expect.arrayContaining([
                    expect.objectContaining({ code: '101' }),
                    expect.objectContaining({ code: '102' }),
                  ]),
                }),
              ],
            }),
          ],
        }),
      )
      expect(screen.getByRole('heading', { name: 'Mídia' })).toBeInTheDocument()
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
      draftBuilding({ wizard_step: 3, description: 'Texto inicial.', published: false }),
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
        wizard_step: 3,
      })
      expect(screen.getByText('Lista de empreendimentos')).toBeInTheDocument()
    })
  })

  it('resumes a legacy four-step draft on the media step', async () => {
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(draftBuilding({ wizard_step: 4 }))

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Mídia' })).toBeInTheDocument()
  })

  it('publishes when the draft switch is turned off', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.builderApi, 'getBuilding').mockResolvedValue(draftBuilding({ wizard_step: 3 }))
    vi.spyOn(api.builderApi, 'updateBuilding').mockResolvedValue(
      draftBuilding({ wizard_step: 3, published: true, description: null }),
    )

    renderWizard('/buildings/10/wizard')

    expect(await screen.findByRole('heading', { name: 'Mídia' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Rascunho' }))
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    await waitFor(() => {
      expect(api.builderApi.updateBuilding).toHaveBeenCalledWith(10, {
        description: null,
        published: true,
        wizard_step: 3,
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
