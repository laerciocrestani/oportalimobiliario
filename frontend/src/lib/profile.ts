import type { DashboardRole } from '@/config/dashboard-nav'

export type PortalProfile = DashboardRole | 'publico'

const HOST_PROFILE: Record<string, PortalProfile> = {
  'construtora.localhost': 'construtora',
  'corretor.localhost': 'corretor',
  'admin.localhost': 'admin',
  'www.localhost': 'publico',
}

export const PORTAL_URLS: Record<PortalProfile, string> = {
  construtora: 'http://construtora.localhost:5173',
  corretor: 'http://corretor.localhost:5173',
  admin: 'http://admin.localhost:5173',
  publico: 'http://www.localhost:5173',
}

export const PORTAL_LABELS: Record<PortalProfile, string> = {
  construtora: 'Construtora',
  corretor: 'Corretor',
  admin: 'Admin SaaS',
  publico: 'Portal público',
}

export function resolveProfile(hostname: string): PortalProfile | null {
  return HOST_PROFILE[hostname] ?? null
}

export function isAuthenticatedProfile(profile: PortalProfile): profile is DashboardRole {
  return profile !== 'publico'
}

export function isRoleAllowedOnProfile(role: string, profile: PortalProfile): boolean {
  if (!isAuthenticatedProfile(profile)) {
    return false
  }

  return role === profile
}
