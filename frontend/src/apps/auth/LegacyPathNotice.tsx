import { PORTAL_LABELS, PORTAL_URLS, type PortalProfile } from '@/lib/profile'

type LegacyPathNoticeProps = {
  profile: PortalProfile
}

export function LegacyPathNotice({ profile }: LegacyPathNoticeProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Rota movida para subdomínio</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        O portal {PORTAL_LABELS[profile]} não usa mais paths como <code>/{profile}</code>. Acesse pelo
        subdomínio dedicado.
      </p>
      <a
        href={PORTAL_URLS[profile]}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Ir para {PORTAL_URLS[profile]}
      </a>
    </div>
  )
}
