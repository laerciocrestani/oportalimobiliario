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
  detail?: ReactNode
  actions?: ReactNode
  fill?: boolean
}

export function DashboardShell({ role, title, children, navConfig, detail, actions, fill = false }: DashboardShellProps) {
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
        <SiteHeader title={title} detail={detail} actions={actions} />
        <div className={cn('flex flex-1 flex-col', fill && 'min-h-0 overflow-hidden')}>
          <div className={cn('@container/main flex flex-1 flex-col gap-2', fill && 'min-h-0')}>
            <div
              className={cn(
                'flex flex-col gap-2 px-2 py-2 md:gap-3 md:px-3 md:py-3',
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
