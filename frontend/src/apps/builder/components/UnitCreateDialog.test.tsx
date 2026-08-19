import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UnitCreateDialog } from '@/apps/builder/components/UnitCreateDialog'
import { builderApi, type Unit } from '@/lib/api'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    builderApi: {
      ...actual.builderApi,
      createUnit: vi.fn(),
      listAmenities: vi.fn().mockResolvedValue([]),
    },
  }
})

const towers = [
  { id: 1, name: 'Torre A', sort_order: 0 },
  { id: 2, name: 'Torre B', sort_order: 1 },
]

const defaultProps = {
  buildingId: 10,
  towers,
  open: true,
  onOpenChange: () => {},
  onCreated: () => {},
}

describe('UnitCreateDialog', () => {
  it('renders form fields when open', () => {
    render(<UnitCreateDialog {...defaultProps} />)

    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('heading', { name: 'Nova unidade' })).toBeInTheDocument()
    expect(screen.getByLabelText('Código')).toBeInTheDocument()
    expect(screen.getByLabelText('Torre')).toBeInTheDocument()
    expect(screen.getByLabelText('Andar')).toBeInTheDocument()
    expect(screen.getByLabelText('Área privativa (m²)')).toBeInTheDocument()
    expect(screen.getByLabelText('Preço-base (R$)')).toBeInTheDocument()
    expect(screen.getByLabelText('Competência INCC')).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })

  it('creates unit with correct payload', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    const created: Unit = {
      id: 99,
      code: '501',
      floor: 5,
      area_m2: '72',
      price: '500000',
      status: 'available',
      tower_id: 1,
      tower: { id: 1, name: 'Torre A' },
    }

    vi.mocked(builderApi.createUnit).mockResolvedValue(created)

    render(<UnitCreateDialog {...defaultProps} onCreated={onCreated} />)

    await user.type(screen.getByLabelText('Código'), '501')
    await user.selectOptions(screen.getByLabelText('Torre'), '1')
    await user.type(screen.getByLabelText('Andar'), '5')
    await user.type(screen.getByLabelText('Área privativa (m²)'), '72')
    await user.type(screen.getByLabelText('Preço-base (R$)'), '500000')
    await user.click(screen.getByRole('button', { name: 'Criar unidade' }))

    expect(builderApi.createUnit).toHaveBeenCalledWith(10, expect.objectContaining({
      code: '501',
      tower_id: 1,
      floor: 5,
      area_m2: '72',
      price_base: '500000',
      status: 'available',
    }))
    expect(onCreated).toHaveBeenCalledWith(created)
  })

  it('disables submit when there are no towers', () => {
    render(<UnitCreateDialog {...defaultProps} towers={[]} />)

    expect(
      screen.getByText(/Cadastre uma torre antes de incluir unidades/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar unidade' })).toBeDisabled()
  })

  it('shows tower hint for users who can manage buildings', () => {
    render(<UnitCreateDialog {...defaultProps} towers={[]} canManageBuildings />)

    expect(screen.getByText(/Use a aba Torres para adicionar/)).toBeInTheDocument()
  })

  it('preselects tower when only one exists', () => {
    render(
      <UnitCreateDialog
        {...defaultProps}
        towers={[{ id: 7, name: 'Torre única', sort_order: 0 }]}
      />,
    )

    expect(screen.getByLabelText('Torre')).toHaveValue('7')
  })
})
