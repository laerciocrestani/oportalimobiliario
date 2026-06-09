import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { clearToken, fetchMe, getToken } from '@/lib/api'
import { isRoleAllowedOnProfile, type PortalProfile } from '@/lib/profile'

type ProfileGuardProps = {
  profile: PortalProfile
  children: ReactNode
}

type GuardState = 'loading' | 'allowed' | 'unauthenticated' | 'forbidden'

export function ProfileGuard({ profile, children }: ProfileGuardProps) {
  const location = useLocation()
  const [state, setState] = useState<GuardState>('loading')

  useEffect(() => {
    let cancelled = false

    async function verify(): Promise<void> {
      const token = getToken()

      if (token === null) {
        if (!cancelled) {
          setState('unauthenticated')
        }

        return
      }

      try {
        const user = await fetchMe()

        if (!cancelled) {
          setState(isRoleAllowedOnProfile(user.role, profile) ? 'allowed' : 'forbidden')
        }
      } catch {
        clearToken()

        if (!cancelled) {
          setState('unauthenticated')
        }
      }
    }

    void verify()

    return () => {
      cancelled = true
    }
  }, [profile, location.pathname])

  if (state === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Verificando acesso...
      </div>
    )
  }

  if (state === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (state === 'forbidden') {
    clearToken()

    return <Navigate to="/login" replace state={{ error: 'Conta não autorizada neste portal.' }} />
  }

  return children
}
