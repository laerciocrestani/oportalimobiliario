import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UnitDetailDrawer } from '@/apps/builder/components/UnitDetailDrawer'
import { builderApi, type Unit } from '@/lib/api'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    builderApi: {
      ...actual.builderApi,
      updateUnit: vi.fn(),
    },
  }
})

const unit: Unit = {
  id: 1,
  code: '1201',
  floor: 12,
  area_m2: '72',
  price: '650000',
  status: 'available',
  tower_id: 1,
  tower: { id: 1, name: 'Torre A' },
}

const towers = [{ id: 1, name: 'Torre A', sort_order: 0 }]

const defaultProps = {
  buildingId: 10,
  buildingName: 'Residencial Aurora',
  towers,
  open: true,
  onOpenChange: () => {},
  canManage: false,
  canUpdateStatus: false,
  onSaved: () => {},
}

describe('UnitDetailDrawer', () => {
  it('shows unit details when open', () => {
    render(<UnitDetailDrawer unit={unit} {...defaultProps} />)

    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('heading', { name: '1201' })).toBeInTheDocument()
    expect(within(dialog).getByText('Torre A')).toBeInTheDocument()
    expect(within(dialog).getByText('12')).toBeInTheDocument()
    expect(within(dialog).getByText('72 m²')).toBeInTheDocument()
    expect(within(dialog).getByText('Disponível')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Residencial Aurora')).toHaveLength(2)
  })

  it('shows edit button when user can manage units', async () => {
    const user = userEvent.setup()
    render(<UnitDetailDrawer unit={unit} {...defaultProps} canManage />)

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.getByLabelText('Código')).toHaveValue('1201')
    expect(screen.getByLabelText('Torre')).toHaveValue('1')
  })

  it('saves unit changes when user can manage units', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    const updated: Unit = { ...unit, code: '1202' }

    vi.mocked(builderApi.updateUnit).mockResolvedValue(updated)

    render(
      <UnitDetailDrawer unit={unit} {...defaultProps} canManage onSaved={onSaved} />,
    )

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.clear(screen.getByLabelText('Código'))
    await user.type(screen.getByLabelText('Código'), '1202')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(builderApi.updateUnit).toHaveBeenCalledWith(10, 1, expect.objectContaining({ code: '1202' }))
    expect(onSaved).toHaveBeenCalledWith(updated)
  })

  it('allows status-only edit when user has units.update_status', async () => {
    const user = userEvent.setup()

    render(
      <UnitDetailDrawer unit={unit} {...defaultProps} canUpdateStatus />,
    )

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })
})
