import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Construtora', href: '/construtora' },
  { label: 'Corretor', href: '/corretor' },
  { label: 'Admin', href: '/admin' },
  { label: 'Público', href: '/publico' },
]

export function AppShell() {
  const location = useLocation()

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <aside className="flex w-56 flex-col border-r border-border bg-sidebar p-4">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold">Oportalimobiliário</p>
          <p className="text-xs text-muted-foreground">Shell compartilhado</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent',
                location.pathname.startsWith(item.href) && 'bg-sidebar-accent font-medium',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border px-6 py-4">
          <h1 className="text-lg font-medium">Dashboard</h1>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
