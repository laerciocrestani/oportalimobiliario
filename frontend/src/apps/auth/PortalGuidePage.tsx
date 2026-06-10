import { GalleryVerticalEnd } from 'lucide-react'
import { PORTAL_LABELS, PORTAL_URLS, type PortalProfile } from '@/lib/profile'

const portalOrder: PortalProfile[] = ['builder', 'broker', 'admin', 'public']

export function PortalGuidePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="flex items-center gap-2 font-medium">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="size-4" />
        </div>
        Oportalimobiliário
      </div>
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold">Escolha o portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cada perfil possui um subdomínio dedicado. Acesse o portal correspondente à sua função.
        </p>
      </div>
      <ul className="grid w-full max-w-md gap-3">
        {portalOrder.map((portal) => (
          <li key={portal}>
            <a
              href={PORTAL_URLS[portal]}
              className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <span>{PORTAL_LABELS[portal]}</span>
              <span className="text-muted-foreground">{PORTAL_URLS[portal].replace('http://', '')}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
