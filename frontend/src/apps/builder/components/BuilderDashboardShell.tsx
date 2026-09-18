import { useMemo, type ReactNode } from 'react'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { dashboardNav } from '@/config/dashboard-nav'
import { useReservationNavBadge } from '@/hooks/use-reservation-nav-badge'

type BuilderDashboardShellProps = {
  title: string
  children: ReactNode
  actions?: ReactNode
  fill?: boolean
}

export function BuilderDashboardShell({ title, children, actions, fill = false }: BuilderDashboardShellProps) {
  const { user, permissions } = useBuilderPermissions()
  const canManageReservations = permissions.includes('reservations.cancel')
  const { count: pendingActionsCount, witnessScope } = useReservationNavBadge('builder', true)
  const canAccessReservations = canManageReservations || witnessScope || pendingActionsCount > 0

  const navConfig = useMemo(() => {
    const base = dashboardNav.builder

    const navMain = base.navMain
      .filter((item) => {
        if (item.url === '/buildings') {
          return permissions.includes('buildings.view')
        }
        if (item.url === '/reservations') {
          return canAccessReservations
        }
        if (item.url === '/contracts') {
          return permissions.includes('contracts.manage')
        }
        if (item.url === '/proposals') {
          return permissions.includes('proposals.manage')
        }
        if (item.url === '/team') {
          return permissions.includes('team.manage')
        }
        if (item.url === '/invites') {
          return permissions.includes('invites.send')
        }
        if (item.url === '/brokers') {
          return permissions.includes('access.manage')
        }

        // /activity is visible to every authenticated builder (own log).
        return true
      })
      .map((item) =>
        item.url === '/reservations' ? { ...item, badge: pendingActionsCount } : item,
      )

    return {
      ...base,
      user: user
        ? { name: user.name, email: user.email }
        : base.user,
      navMain,
    }
  }, [canAccessReservations, pendingActionsCount, permissions, user])

  return (
    <DashboardShell role="builder" title={title} navConfig={navConfig} actions={actions} fill={fill}>
      {children}
    </DashboardShell>
  )
}
