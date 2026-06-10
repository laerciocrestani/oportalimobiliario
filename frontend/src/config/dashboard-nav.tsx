import {
  Building2Icon,
  HandshakeIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  ShieldIcon,
  UsersIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

export type DashboardRole = 'builder' | 'broker' | 'admin'

export type DashboardNavItem = {
  title: string
  url: string
  icon: ReactNode
}

export type DashboardNavConfig = {
  brand: string
  user: {
    name: string
    email: string
    avatar?: string
  }
  navMain: DashboardNavItem[]
  navSecondary: DashboardNavItem[]
}

export const dashboardNav: Record<DashboardRole, DashboardNavConfig> = {
  builder: {
    brand: 'Construtora',
    user: {
      name: 'Construtora Alpha',
      email: 'construtora@alpha.demo',
    },
    navMain: [
      {
        title: 'Visão geral',
        url: '/',
        icon: <LayoutDashboardIcon />,
      },
      {
        title: 'Empreendimentos',
        url: '/',
        icon: <Building2Icon />,
      },
      {
        title: 'Convites',
        url: '/',
        icon: <UsersIcon />,
      },
    ],
    navSecondary: [
      {
        title: 'Configurações',
        url: '/',
        icon: <Settings2Icon />,
      },
    ],
  },
  broker: {
    brand: 'Corretor',
    user: {
      name: 'Corretor Demo',
      email: 'corretor@demo.com',
    },
    navMain: [
      {
        title: 'Visão geral',
        url: '/',
        icon: <LayoutDashboardIcon />,
      },
      {
        title: 'Minhas unidades',
        url: '/',
        icon: <Building2Icon />,
      },
      {
        title: 'Convites',
        url: '/',
        icon: <HandshakeIcon />,
      },
    ],
    navSecondary: [
      {
        title: 'Configurações',
        url: '/',
        icon: <Settings2Icon />,
      },
    ],
  },
  admin: {
    brand: 'Admin SaaS',
    user: {
      name: 'Admin SaaS',
      email: 'admin@oportalimobiliario.com.br',
    },
    navMain: [
      {
        title: 'Visão geral',
        url: '/',
        icon: <LayoutDashboardIcon />,
      },
      {
        title: 'Tenants',
        url: '/',
        icon: <ShieldIcon />,
      },
    ],
    navSecondary: [
      {
        title: 'Configurações',
        url: '/',
        icon: <Settings2Icon />,
      },
    ],
  },
}
