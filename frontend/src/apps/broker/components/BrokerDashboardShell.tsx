import { useMemo, type ReactNode } from 'react'
import { useBrokerSession } from '@/apps/broker/hooks/use-broker-session'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { dashboardNav } from '@/config/dashboard-nav'
import { useReservationNavBadge } from '@/hooks/use-reservation-nav-badge'

type BrokerDashboardShellProps = {
  title: string
  children: ReactNode
}

export function BrokerDashboardShell({ title, children }: BrokerDashboardShellProps) {
  const { navUser } = useBrokerSession()
  const { count: pendingRepliesCount } = useReservationNavBadge('broker', true)

  const navConfig = useMemo(() => {
    const base = dashboardNav.broker

    const navMain = base.navMain.map((item) =>
      item.url === '/reservations' ? { ...item, badge: pendingRepliesCount } : item,
    )

    return {
      ...base,
      user: navUser ?? base.user,
      navMain,
    }
  }, [navUser, pendingRepliesCount])

  return (
    <DashboardShell role="broker" title={title} navConfig={navConfig}>
      {children}
    </DashboardShell>
  )
}
