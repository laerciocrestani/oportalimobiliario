import { describe, expect, it } from 'vitest'
import {
  isRoleAllowedOnProfile,
  PORTAL_URLS,
  resolveProfile,
} from '@/lib/profile'

describe('resolveProfile', () => {
  it('maps known hostnames to portal profiles', () => {
    expect(resolveProfile('construtora.localhost')).toBe('construtora')
    expect(resolveProfile('corretor.localhost')).toBe('corretor')
    expect(resolveProfile('admin.localhost')).toBe('admin')
    expect(resolveProfile('www.localhost')).toBe('publico')
  })

  it('returns null for unknown hostnames', () => {
    expect(resolveProfile('localhost')).toBeNull()
    expect(resolveProfile('example.com')).toBeNull()
  })
})

describe('isRoleAllowedOnProfile', () => {
  it('allows matching roles on authenticated portals', () => {
    expect(isRoleAllowedOnProfile('construtora', 'construtora')).toBe(true)
    expect(isRoleAllowedOnProfile('corretor', 'corretor')).toBe(true)
    expect(isRoleAllowedOnProfile('admin', 'admin')).toBe(true)
  })

  it('rejects mismatched roles', () => {
    expect(isRoleAllowedOnProfile('corretor', 'construtora')).toBe(false)
    expect(isRoleAllowedOnProfile('admin', 'corretor')).toBe(false)
  })

  it('rejects any role on public portal', () => {
    expect(isRoleAllowedOnProfile('construtora', 'publico')).toBe(false)
  })
})

describe('PORTAL_URLS', () => {
  it('defines dev URLs for every portal', () => {
    expect(PORTAL_URLS.construtora).toContain('construtora.localhost')
    expect(PORTAL_URLS.publico).toContain('www.localhost')
  })
})
