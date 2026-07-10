import { describe, expect, it } from 'vitest'
import {
  isRoleAllowedOnProfile,
  PORTAL_URLS,
  resolveProfile,
} from '@/lib/profile'

describe('resolveProfile', () => {
  it('maps known hostnames to portal profiles', () => {
    expect(resolveProfile('construtora.localhost')).toBe('builder')
    expect(resolveProfile('corretor.localhost')).toBe('broker')
    expect(resolveProfile('admin.localhost')).toBe('admin')
    expect(resolveProfile('www.localhost')).toBeNull()
  })

  it('returns null for unknown hostnames', () => {
    expect(resolveProfile('localhost')).toBeNull()
    expect(resolveProfile('example.com')).toBeNull()
  })
})

describe('isRoleAllowedOnProfile', () => {
  it('allows matching roles on authenticated portals', () => {
    expect(isRoleAllowedOnProfile('builder', 'builder')).toBe(true)
    expect(isRoleAllowedOnProfile('broker', 'broker')).toBe(true)
    expect(isRoleAllowedOnProfile('admin', 'admin')).toBe(true)
  })

  it('rejects mismatched roles', () => {
    expect(isRoleAllowedOnProfile('broker', 'builder')).toBe(false)
    expect(isRoleAllowedOnProfile('admin', 'broker')).toBe(false)
  })

  it('rejects any role on public portal', () => {
    expect(isRoleAllowedOnProfile('builder', 'public')).toBe(false)
  })
})

describe('PORTAL_URLS', () => {
  it('defines dev URLs for every portal', () => {
    expect(PORTAL_URLS.builder).toContain('construtora.localhost')
    expect(PORTAL_URLS.public).toContain('www.localhost:4321')
  })
})
