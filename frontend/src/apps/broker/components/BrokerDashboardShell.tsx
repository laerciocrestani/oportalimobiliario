import { useMemo, type ReactNode } from 'react'
import { useBrokerSession } from '@/apps/broker/hooks/use-broker-session'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { dashboardNav } from '@/config/dashboard-nav'

type BrokerDashboardShellProps = {
  title: string
  children: ReactNode
}

export function BrokerDashboardShell({ title, children }: BrokerDashboardShellProps) {
  const { navUser } = useBrokerSession()

  const navConfig = useMemo(() => {
    const base = dashboardNav.broker

    return {
      ...base,
      user: navUser ?? base.user,
    }
  }, [navUser])

  return (
    <DashboardShell role="broker" title={title} navConfig={navConfig}>
      {children}
    </DashboardShell>
  )
}
