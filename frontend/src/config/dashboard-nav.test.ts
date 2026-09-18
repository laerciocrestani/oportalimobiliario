import { describe, expect, it } from 'vitest'
import { dashboardNav } from '@/config/dashboard-nav'

describe('dashboardNav', () => {
  it('includes Contratos and Propostas in the builder sidebar', () => {
    expect(dashboardNav.builder.navMain).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Contratos', url: '/contracts' }),
        expect.objectContaining({ title: 'Propostas', url: '/proposals' }),
      ]),
    )
  })

  it.each(['builder', 'broker', 'admin'] as const)(
    'includes Atividade in the %s sidebar',
    (role) => {
      expect(dashboardNav[role].navMain).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Atividade', url: '/activity' }),
        ]),
      )
    },
  )
})
