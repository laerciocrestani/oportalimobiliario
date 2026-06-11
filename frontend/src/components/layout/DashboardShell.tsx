import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { dashboardNav, type DashboardNavConfig, type DashboardRole } from '@/config/dashboard-nav'

type DashboardShellProps = {
  role: DashboardRole
  title: string
  children: ReactNode
  navConfig?: DashboardNavConfig
}

export function DashboardShell({ role, title, children, navConfig }: DashboardShellProps) {
  const config = navConfig ?? dashboardNav[role]

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" config={config} />
      <SidebarInset>
        <SiteHeader title={title} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
