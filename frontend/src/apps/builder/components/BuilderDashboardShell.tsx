import { useMemo, type ReactNode } from 'react'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { dashboardNav } from '@/config/dashboard-nav'

type BuilderDashboardShellProps = {
  title: string
  children: ReactNode
}

export function BuilderDashboardShell({ title, children }: BuilderDashboardShellProps) {
  const { user, permissions } = useBuilderPermissions()

  const navConfig = useMemo(() => {
    const base = dashboardNav.builder

    const navMain = base.navMain.filter((item) => {
      if (item.url === '/buildings') {
        return permissions.includes('buildings.view')
      }
      if (item.url === '/team') {
        return permissions.includes('team.manage')
      }
      if (item.url === '/#convites') {
        return permissions.includes('invites.send')
      }

      return true
    })

    return {
      ...base,
      user: user
        ? { name: user.name, email: user.email }
        : base.user,
      navMain,
    }
  }, [permissions, user])

  return (
    <DashboardShell role="builder" title={title} navConfig={navConfig}>
      {children}
    </DashboardShell>
  )
}
