import * as React from 'react'
import { Link } from 'react-router-dom'
import { CommandIcon } from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { DashboardNavConfig } from '@/config/dashboard-nav'

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  config: DashboardNavConfig
}

export function AppSidebar({ config, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link to={config.navMain[0]?.url ?? '/'} />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">Oportalimobiliário</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="px-2 text-xs text-muted-foreground">{config.brand}</p>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={config.navMain} />
        <NavSecondary items={config.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={config.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
