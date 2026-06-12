import { useEffect, useMemo, useState } from 'react'
import { fetchMe, type AuthUser } from '@/lib/api'

export function useBrokerSession() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const navUser = useMemo(
    () =>
      user
        ? { name: user.name, email: user.email }
        : undefined,
    [user],
  )

  return { user, navUser, loading }
}
