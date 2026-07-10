import type { DashboardRole } from '@/config/dashboard-nav'

export type PortalProfile = DashboardRole | 'public'

const HOST_PROFILE: Record<string, PortalProfile> = {
  'construtora.localhost': 'builder',
  'corretor.localhost': 'broker',
  'admin.localhost': 'admin',
}

export const PORTAL_URLS: Record<PortalProfile, string> = {
  builder: 'http://construtora.localhost:5173',
  broker: 'http://corretor.localhost:5173',
  admin: 'http://admin.localhost:5173',
  public: 'http://www.localhost:4321',
}

export const PORTAL_LABELS: Record<PortalProfile, string> = {
  builder: 'Construtora',
  broker: 'Corretor',
  admin: 'Admin SaaS',
  public: 'Portal público',
}

export function resolveProfile(hostname: string): PortalProfile | null {
  return HOST_PROFILE[hostname] ?? null
}

export function isAuthenticatedProfile(profile: PortalProfile): profile is DashboardRole {
  return profile !== 'public'
}

export function isRoleAllowedOnProfile(role: string, profile: PortalProfile): boolean {
  if (!isAuthenticatedProfile(profile)) {
    return false
  }

  return role === profile
}
