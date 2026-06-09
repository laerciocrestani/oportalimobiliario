import {
  Building2Icon,
  HandshakeIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  ShieldIcon,
  UsersIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

export type DashboardRole = 'construtora' | 'corretor' | 'admin'

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
  construtora: {
    brand: 'Construtora',
    user: {
      name: 'Construtora Alpha',
      email: 'construtora@alpha.demo',
    },
    navMain: [
      {
        title: 'Visão geral',
        url: '/construtora',
        icon: <LayoutDashboardIcon />,
      },
      {
        title: 'Empreendimentos',
        url: '/construtora',
        icon: <Building2Icon />,
      },
      {
        title: 'Convites',
        url: '/construtora',
        icon: <UsersIcon />,
      },
    ],
    navSecondary: [
      {
        title: 'Configurações',
        url: '/construtora',
        icon: <Settings2Icon />,
      },
    ],
  },
  corretor: {
    brand: 'Corretor',
    user: {
      name: 'Corretor Demo',
      email: 'corretor@demo.com',
    },
    navMain: [
      {
        title: 'Visão geral',
        url: '/corretor',
        icon: <LayoutDashboardIcon />,
      },
      {
        title: 'Minhas unidades',
        url: '/corretor',
        icon: <Building2Icon />,
      },
      {
        title: 'Convites',
        url: '/corretor',
        icon: <HandshakeIcon />,
      },
    ],
    navSecondary: [
      {
        title: 'Configurações',
        url: '/corretor',
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
        url: '/admin',
        icon: <LayoutDashboardIcon />,
      },
      {
        title: 'Tenants',
        url: '/admin',
        icon: <ShieldIcon />,
      },
    ],
    navSecondary: [
      {
        title: 'Configurações',
        url: '/admin',
        icon: <Settings2Icon />,
      },
    ],
  },
}
