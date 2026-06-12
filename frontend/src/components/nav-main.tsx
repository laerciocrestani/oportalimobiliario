import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    badge?: number
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} render={<Link to={item.url} />}>
                {item.icon}
                <span className="flex-1">{item.title}</span>
                {item.badge && item.badge > 0 ? (
                  <Badge variant="destructive" className="ml-auto min-w-5 justify-center px-1.5">
                    {item.badge}
                  </Badge>
                ) : null}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
