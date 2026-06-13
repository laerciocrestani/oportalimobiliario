import type { ReactNode } from 'react'
import { PublicFooter } from '@/apps/public/components/PublicFooter'
import { PublicHeader } from '@/apps/public/components/PublicHeader'

type PublicLayoutProps = {
  children: ReactNode
  hero?: ReactNode
}

export function PublicLayout({ children, hero }: PublicLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />
      {hero}
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
