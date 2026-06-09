import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ConstrutoraHome } from '@/apps/construtora/ConstrutoraHome'
import { AppShell } from '@/components/layout/AppShell'

describe('frontend-shell', () => {
  it('renders construtora dashboard', () => {
    render(<ConstrutoraHome />)
    expect(screen.getByText('Construtora')).toBeInTheDocument()
  })

  it('renders shared shell navigation', () => {
    render(
      <MemoryRouter initialEntries={['/construtora']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/construtora" element={<ConstrutoraHome />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Oportalimobiliário')).toBeInTheDocument()
    expect(screen.getAllByText('Construtora').length).toBeGreaterThan(0)
    expect(screen.getByText('Corretor')).toBeInTheDocument()
  })
})
