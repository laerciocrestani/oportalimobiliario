import { Building2Icon } from 'lucide-react'

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md" role="banner">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2Icon className="size-5" aria-hidden />
          </span>
          <span>Dia de Imóveis</span>
        </a>

        <nav className="flex items-center gap-4 text-sm">
          <a
            href="#lancamentos"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Lançamentos
          </a>
          <a
            href="http://corretor.localhost:5173/login"
            className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Corretor
          </a>
          <a
            href="http://construtora.localhost:5173/login"
            className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Construtora
          </a>
        </nav>
      </div>
    </header>
  )
}
