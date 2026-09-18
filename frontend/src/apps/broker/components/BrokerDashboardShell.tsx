import { useMemo, type ReactNode } from 'react'
import { useBrokerSession } from '@/apps/broker/hooks/use-broker-session'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { dashboardNav } from '@/config/dashboard-nav'
import { useReservationNavBadge } from '@/hooks/use-reservation-nav-badge'

type BrokerDashboardShellProps = {
  title: string
  children: ReactNode
  fill?: boolean
}

export function BrokerDashboardShell({ title, children, fill = false }: BrokerDashboardShellProps) {
  const { navUser } = useBrokerSession()
  const { count: pendingActionsCount } = useReservationNavBadge('broker', true)

  const navConfig = useMemo(() => {
    const base = dashboardNav.broker

    const navMain = base.navMain.map((item) =>
      item.url === '/reservations' ? { ...item, badge: pendingActionsCount } : item,
    )

    return {
      ...base,
      user: navUser ?? base.user,
      navMain,
    }
  }, [navUser, pendingActionsCount])

  return (
    <DashboardShell role="broker" title={title} navConfig={navConfig} fill={fill}>
      {children}
    </DashboardShell>
  )
}
