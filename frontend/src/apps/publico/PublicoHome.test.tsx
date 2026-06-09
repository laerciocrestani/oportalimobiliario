import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PublicoHome } from '@/apps/publico/PublicoHome'
import * as api from '@/lib/api'

describe('PublicoHome', () => {
  it('lists published empreendimentos', async () => {
    vi.spyOn(api.publicApi, 'listEmpreendimentos').mockResolvedValue([
      {
        id: 1,
        nome: 'Residencial Aurora',
        descricao: 'Demo',
        cidade: 'São Paulo',
        estado: 'SP',
        publicado: true,
        seo_title: 'Aurora SP',
        seo_description: 'Lançamento demo',
      },
    ])

    render(<PublicoHome />)

    await waitFor(() => {
      expect(screen.getByText('Residencial Aurora')).toBeInTheDocument()
    })
  })

  it('loads detail with SEO on click', async () => {
    const user = userEvent.setup()
    vi.spyOn(api.publicApi, 'listEmpreendimentos').mockResolvedValue([
      {
        id: 1,
        nome: 'Residencial Aurora',
        descricao: 'Demo',
        cidade: 'São Paulo',
        estado: 'SP',
        publicado: true,
        seo_title: 'Aurora SP',
        seo_description: 'Lançamento demo',
      },
    ])
    vi.spyOn(api.publicApi, 'getEmpreendimento').mockResolvedValue({
      id: 1,
      nome: 'Residencial Aurora',
      descricao: 'Descrição completa',
      cidade: 'São Paulo',
      estado: 'SP',
      publicado: true,
      seo_title: 'Aurora SP',
      seo_description: 'Lançamento demo',
      unidades: [{ id: 1, codigo: '101', andar: 1, area_m2: '70', preco: '400000', status: 'disponivel' }],
    })

    render(<PublicoHome />)

    await user.click(await screen.findByText('Residencial Aurora'))

    await waitFor(() => {
      expect(document.title).toBe('Aurora SP')
      expect(screen.getByText('Descrição completa')).toBeInTheDocument()
      expect(screen.getByText('101')).toBeInTheDocument()
    })
  })
})
