import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ConstrutoraHome } from '@/apps/construtora/ConstrutoraHome'
import { AppShell } from '@/components/layout/AppShell'

describe('frontend-shell', () => {
  it('renders construtora dashboard', () => {
    render(
      <MemoryRouter>
        <ConstrutoraHome />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Empreendimentos', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Oportalimobiliário')).toBeInTheDocument()
  })

  it('renders shared shell navigation for public area', () => {
    render(
      <MemoryRouter initialEntries={['/publico']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="publico" element={<div>Portal público</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Oportalimobiliário')).toBeInTheDocument()
    expect(screen.getByText('Corretor')).toBeInTheDocument()
  })
})
