import { useEffect, useState } from 'react'
import { fetchMe, type AuthUser } from '@/lib/api'
import type { BuilderPermission } from '@/apps/builder/lib/builder-permissions'

export function useBuilderPermissions() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const permissions = user?.permissions ?? []

  function can(permission: BuilderPermission): boolean {
    return permissions.includes(permission)
  }

  return { user, permissions, can, loading }
}
