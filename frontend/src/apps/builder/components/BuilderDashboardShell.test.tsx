import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'

const permissionsRef = vi.hoisted(() => ({
  current: ['buildings.view', 'reservations.cancel'] as string[],
}))

vi.mock('@/apps/builder/hooks/use-builder-permissions', () => ({
  useBuilderPermissions: () => ({
    can: (permission: string) => permissionsRef.current.includes(permission),
    permissions: permissionsRef.current,
    loading: false,
    user: { name: 'Builder', email: 'builder@demo.com' },
  }),
}))

vi.mock('@/hooks/use-reservation-nav-badge', () => ({
  useReservationNavBadge: () => ({ count: 0 }),
}))

vi.mock('@/components/layout/DashboardShell', () => ({
  DashboardShell: ({
    title,
    navConfig,
    children,
  }: {
    title: string
    navConfig: { navMain: Array<{ title: string; url: string }> }
    children: React.ReactNode
  }) => (
    <div>
      <h1>{title}</h1>
      <nav>
        {navConfig.navMain.map((item) => (
          <a key={item.url} href={item.url}>
            {item.title}
          </a>
        ))}
      </nav>
      {children}
    </div>
  ),
}))

describe('BuilderDashboardShell', () => {
  it('shows Contratos only when contracts.manage is granted', () => {
    permissionsRef.current = ['buildings.view', 'reservations.cancel']
    const { rerender } = render(
      <BuilderDashboardShell title="Visão geral">
        <p>conteúdo</p>
      </BuilderDashboardShell>,
    )

    expect(screen.queryByRole('link', { name: 'Contratos' })).not.toBeInTheDocument()

    permissionsRef.current = ['buildings.view', 'reservations.cancel', 'contracts.manage']
    rerender(
      <BuilderDashboardShell title="Visão geral">
        <p>conteúdo</p>
      </BuilderDashboardShell>,
    )

    expect(screen.getByRole('link', { name: 'Contratos' })).toHaveAttribute('href', '/contracts')
  })

  it('shows Atividade even without audit.view', () => {
    permissionsRef.current = ['buildings.view']

    render(
      <BuilderDashboardShell title="Visão geral">
        <p>conteúdo</p>
      </BuilderDashboardShell>,
    )

    expect(screen.getByRole('link', { name: 'Atividade' })).toHaveAttribute('href', '/activity')
  })
})
