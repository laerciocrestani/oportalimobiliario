import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { dashboardNav, type DashboardNavConfig, type DashboardRole } from '@/config/dashboard-nav'
import { cn } from '@/lib/utils'

type DashboardShellProps = {
  role: DashboardRole
  title: string
  children: ReactNode
  navConfig?: DashboardNavConfig
  actions?: ReactNode
  fill?: boolean
}

export function DashboardShell({ role, title, children, navConfig, actions, fill = false }: DashboardShellProps) {
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
      <SidebarInset className={fill ? 'h-svh min-h-0 overflow-hidden md:h-[calc(100svh-1rem)]' : undefined}>
        <SiteHeader title={title} actions={actions} />
        <div className={cn('flex flex-1 flex-col', fill && 'min-h-0 overflow-hidden')}>
          <div className={cn('@container/main flex flex-1 flex-col gap-2', fill && 'min-h-0')}>
            <div
              className={cn(
                'flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6',
                fill && 'min-h-0 flex-1 overflow-hidden',
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
