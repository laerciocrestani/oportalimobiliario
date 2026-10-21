import {
  ActivityIcon,
  Building2Icon,
  CalendarClockIcon,
  FileTextIcon,
  HandshakeIcon,
  LayersIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  ShieldIcon,
  TrendingUpIcon,
  UserRoundCheckIcon,
  UsersIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

export type DashboardRole = 'builder' | 'broker' | 'admin'

export type DashboardNavItem = {
  title: string
  url: string
  icon: ReactNode
  badge?: number
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
        url: '/buildings',
        icon: <Building2Icon />,
      },
      {
        title: 'Reservas',
        url: '/reservations',
        icon: <CalendarClockIcon />,
      },
      {
        title: 'Contratos',
        url: '/contracts',
        icon: <FileTextIcon />,
      },
      {
        title: 'Convites',
        url: '/invites',
        icon: <HandshakeIcon />,
      },
      {
        title: 'Corretores',
        url: '/brokers',
        icon: <UserRoundCheckIcon />,
      },
      {
        title: 'Equipe',
        url: '/team',
        icon: <UsersIcon />,
      },
      {
        title: 'Atividade',
        url: '/activity',
        icon: <ActivityIcon />,
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
        title: 'Empreendimentos',
        url: '/buildings',
        icon: <Building2Icon />,
      },
      {
        title: 'Reservas',
        url: '/reservations',
        icon: <CalendarClockIcon />,
      },
      {
        title: 'Clientes',
        url: '/clients',
        icon: <UsersIcon />,
      },
      {
        title: 'Atividade',
        url: '/activity',
        icon: <ActivityIcon />,
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
      {
        title: 'INCC-M',
        url: '/incc',
        icon: <TrendingUpIcon />,
      },
      {
        title: 'Adicionais',
        url: '/amenities',
        icon: <LayersIcon />,
      },
      {
        title: 'Atividade',
        url: '/activity',
        icon: <ActivityIcon />,
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
