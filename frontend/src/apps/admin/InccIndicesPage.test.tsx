import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InccIndicesPage } from '@/apps/admin/InccIndicesPage'
import * as api from '@/lib/api'

const julyIndex = {
  id: 1,
  competence: '2026-07-01',
  value: '1020.500000',
  source: 'job' as const,
  fetched_at: '2026-07-28T11:05:00.000000Z',
}

describe('InccIndicesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api.adminApi, 'listInccIndices').mockResolvedValue([julyIndex])
  })

  it('lists incc rows and saves an edited value', async () => {
    const user = userEvent.setup()
    const updateSpy = vi.spyOn(api.adminApi, 'updateInccIndex').mockResolvedValue({
      ...julyIndex,
      value: '1021.100000',
    })

    render(
      <MemoryRouter>
        <InccIndicesPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('07/2026')).toBeInTheDocument()
      expect(screen.getByText('Job')).toBeInTheDocument()
    })

    const valueInput = screen.getByLabelText('Valor 07/2026')
    await user.clear(valueInput)
    await user.type(valueInput, '1021.1')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(1, { value: 1021.1 })
    })
  })

  it('creates an index from the form', async () => {
    const user = userEvent.setup()
    const createSpy = vi.spyOn(api.adminApi, 'createInccIndex').mockResolvedValue({
      id: 2,
      competence: '2026-08-01',
      value: '1024.750000',
      source: 'manual',
      fetched_at: null,
    })

    render(
      <MemoryRouter>
        <InccIndicesPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('07/2026')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Competência'), '2026-08-01')
    await user.type(screen.getByLabelText('Valor'), '1024.75')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({ competence: '2026-08-01', value: 1024.75 })
    })
  })

  it('fills the create form from the bcb hint without persisting', async () => {
    const user = userEvent.setup()
    const hintSpy = vi.spyOn(api.adminApi, 'getInccHint').mockResolvedValue({
      competence: '2026-08-01',
      value: '0.620000',
      is_index_number: false,
    })
    const createSpy = vi.spyOn(api.adminApi, 'createInccIndex')

    render(
      <MemoryRouter>
        <InccIndicesPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Consultar BCB' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Consultar BCB' }))

    await waitFor(() => {
      expect(hintSpy).toHaveBeenCalled()
      expect(screen.getByText(/O BCB devolveu variação %/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Usar na criação' }))

    expect(screen.getByLabelText('Competência')).toHaveValue('2026-08-01')
    expect(screen.getByLabelText('Valor')).toHaveValue(0.62)
    expect(createSpy).not.toHaveBeenCalled()
  })
})
