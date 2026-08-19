import { useMemo, type ReactNode } from 'react'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { dashboardNav } from '@/config/dashboard-nav'
import { useReservationNavBadge } from '@/hooks/use-reservation-nav-badge'

type BuilderDashboardShellProps = {
  title: string
  children: ReactNode
  actions?: ReactNode
}

export function BuilderDashboardShell({ title, children, actions }: BuilderDashboardShellProps) {
  const { user, permissions } = useBuilderPermissions()
  const canManageReservations = permissions.includes('reservations.cancel')
  const { count: pendingRepliesCount } = useReservationNavBadge(
    'builder',
    canManageReservations,
  )

  const navConfig = useMemo(() => {
    const base = dashboardNav.builder

    const navMain = base.navMain
      .filter((item) => {
        if (item.url === '/buildings') {
          return permissions.includes('buildings.view')
        }
        if (item.url === '/reservations') {
          return canManageReservations
        }
        if (item.url === '/contracts') {
          return permissions.includes('contracts.manage')
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

        return true
      })
      .map((item) =>
        item.url === '/reservations' ? { ...item, badge: pendingRepliesCount } : item,
      )

    return {
      ...base,
      user: user
        ? { name: user.name, email: user.email }
        : base.user,
      navMain,
    }
  }, [canManageReservations, pendingRepliesCount, permissions, user])

  return (
    <DashboardShell role="builder" title={title} navConfig={navConfig} actions={actions}>
      {children}
    </DashboardShell>
  )
}
